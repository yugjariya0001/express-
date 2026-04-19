import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Coupon } from '../models/Coupon';
import mongoose from 'mongoose';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

// GET /api/admin/stats
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      totalUsers,
      totalRestaurants,
      activeRestaurants,
      revenueResult,
      todayRevenueResult,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ role: 'user' }),
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ isActive: true, isOpen: true }),
      Order.aggregate([
        { $match: { 'payment.status': 'paid' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
      Order.aggregate([
        { $match: { 'payment.status': 'paid', createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        todayOrders,
        totalUsers,
        totalRestaurants,
        activeRestaurants,
        totalRevenue: revenueResult[0]?.total || 0,
        todayRevenue: todayRevenueResult[0]?.total || 0,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/users
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', role, search } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (search) filter.$or = [
      { mobile: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).select('-refreshToken').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, data: { users }, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// GET /api/admin/restaurants
router.get('/restaurants', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurants = await Restaurant.find()
      .populate('owner', 'name mobile')
      .populate('stations', 'code name city')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { restaurants } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch restaurants' });
  }
});

// GET /api/admin/orders
router.get('/orders', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', status } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name mobile')
        .populate('restaurant', 'name')
        .populate('train', 'number name')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Order.countDocuments(filter),
    ]);

    res.json({ success: true, data: { orders }, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// PATCH /api/admin/orders/:id/assign
router.patch('/orders/:id/assign', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deliveryTime, note } = req.body as { deliveryTime?: string; note?: string };
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        ...(deliveryTime && { deliveryTime }),
        $push: { statusHistory: { status: 'out_for_delivery', timestamp: new Date(), note } },
        status: 'out_for_delivery',
      },
      { new: true }
    );
    res.json({ success: true, data: { order } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to assign order' });
  }
});

// GET /api/admin/commissions
router.get('/commissions', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const commissions = await Order.aggregate([
      { $match: { 'payment.status': 'paid' } },
      {
        $group: {
          _id: '$restaurant',
          totalRevenue: { $sum: '$finalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant',
        },
      },
      { $unwind: '$restaurant' },
      {
        $project: {
          restaurantName: '$restaurant.name',
          commissionRate: '$restaurant.commissionRate',
          totalRevenue: 1,
          orderCount: 1,
          commission: {
            $multiply: [
              '$totalRevenue',
              { $divide: ['$restaurant.commissionRate', 100] },
            ],
          },
        },
      },
    ]);

    res.json({ success: true, data: { commissions } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch commissions' });
  }
});

// PATCH /api/admin/commissions/:restaurantId
router.patch('/commissions/:restaurantId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commissionRate } = req.body as { commissionRate: number };
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.restaurantId,
      { commissionRate },
      { new: true }
    );
    res.json({ success: true, data: { restaurant } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update commission' });
  }
});

// POST /api/admin/coupons
router.post('/coupons', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ success: true, data: { coupon } });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/admin/coupons
router.get('/coupons', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, data: { coupons } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch coupons' });
  }
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isActive, role } = req.body as { isActive?: boolean; role?: string };
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...(isActive !== undefined && { isActive }), ...(role && { role }) },
      { new: true }
    ).select('-refreshToken');
    res.json({ success: true, data: { user } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

export default router;
