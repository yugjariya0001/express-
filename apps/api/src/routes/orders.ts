import { Router, Response } from 'express';
import { z } from 'zod';
import { Order } from '../models/Order';
import { Coupon } from '../models/Coupon';
import { FoodItem } from '../models/FoodItem';
import { Restaurant } from '../models/Restaurant';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getIO } from '../socket';

const router = Router();

const placeOrderSchema = z.object({
  restaurantId: z.string(),
  trainId: z.string(),
  boardingStationId: z.string(),
  deliveryStationId: z.string(),
  journeyDate: z.string(),
  pnr: z.string().regex(/^\d{10}$/, 'Invalid PNR'),
  items: z.array(
    z.object({
      foodItemId: z.string(),
      quantity: z.number().min(1).max(10),
    })
  ).min(1),
  couponCode: z.string().optional(),
  specialInstructions: z.string().max(200).optional(),
  paymentMethod: z.string().default('razorpay'),
});

// POST /api/orders/validate-coupon
router.post(
  '/validate-coupon',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { code, cartTotal } = req.body as { code: string; cartTotal: number };

      const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
      if (!coupon) {
        res.status(404).json({ success: false, error: 'Invalid or expired coupon' });
        return;
      }

      if (coupon.expiryDate < new Date()) {
        res.status(400).json({ success: false, error: 'Coupon has expired' });
        return;
      }

      if (cartTotal < coupon.minCartValue) {
        res.status(400).json({
          success: false,
          error: `Minimum cart value of ₹${coupon.minCartValue} required`,
        });
        return;
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        res.status(400).json({ success: false, error: 'Coupon usage limit reached' });
        return;
      }

      let discount = 0;
      if (coupon.type === 'percentage') {
        discount = (cartTotal * coupon.value) / 100;
        if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
      } else {
        discount = coupon.value;
      }

      res.json({
        success: true,
        data: {
          coupon: { code: coupon.code, type: coupon.type, value: coupon.value },
          discount: Math.round(discount),
        },
      });
    } catch {
      res.status(500).json({ success: false, error: 'Coupon validation failed' });
    }
  }
);

// POST /api/orders
router.post(
  '/',
  authenticate,
  validate(placeOrderSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        restaurantId,
        trainId,
        boardingStationId,
        deliveryStationId,
        journeyDate,
        pnr,
        items,
        couponCode,
        specialInstructions,
        paymentMethod,
      } = req.body;

      // Verify restaurant exists
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant || !restaurant.isActive) {
        res.status(404).json({ success: false, error: 'Restaurant not found or inactive' });
        return;
      }

      // Fetch food items and calculate total
      let totalAmount = 0;
      const orderItems = await Promise.all(
        items.map(async (item: { foodItemId: string; quantity: number }) => {
          const foodItem = await FoodItem.findById(item.foodItemId);
          if (!foodItem || !foodItem.isAvailable) {
            throw new Error(`Food item ${item.foodItemId} not available`);
          }
          totalAmount += foodItem.price * item.quantity;
          return {
            foodItem: foodItem._id,
            name: foodItem.name,
            price: foodItem.price,
            quantity: item.quantity,
          };
        })
      );

      // Apply coupon
      let discountAmount = 0;
      if (couponCode) {
        const coupon = await Coupon.findOne({
          code: couponCode.toUpperCase(),
          isActive: true,
          expiryDate: { $gt: new Date() },
        });
        if (coupon && totalAmount >= coupon.minCartValue) {
          if (coupon.type === 'percentage') {
            discountAmount = (totalAmount * coupon.value) / 100;
            if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
          } else {
            discountAmount = coupon.value;
          }
          coupon.usedCount += 1;
          await coupon.save();
        }
      }

      const finalAmount = Math.max(0, totalAmount - Math.round(discountAmount));

      const order = await Order.create({
        user: req.user?._id,
        restaurant: restaurantId,
        train: trainId,
        boardingStation: boardingStationId,
        deliveryStation: deliveryStationId,
        journeyDate: new Date(journeyDate),
        pnr,
        items: orderItems,
        totalAmount,
        discountAmount: Math.round(discountAmount),
        finalAmount,
        coupon: couponCode,
        status: 'placed',
        statusHistory: [{ status: 'placed', timestamp: new Date() }],
        payment: { method: paymentMethod, status: 'pending' },
        specialInstructions,
      });

      const populated = await Order.findById(order._id)
        .populate('restaurant', 'name image')
        .populate('train', 'number name')
        .populate('boardingStation', 'code name city')
        .populate('deliveryStation', 'code name city');

      // Notify restaurant via Socket.IO
      try {
        const io = getIO();
        io.to(`restaurant:${restaurantId}`).emit('order:new', populated);
        io.to('admin').emit('order:new', populated);
      } catch {
        // Socket not critical
      }

      res.status(201).json({ success: true, data: { order: populated } });
    } catch (err: unknown) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  }
);

// GET /api/orders (my orders)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', status } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = { user: req.user?._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('restaurant', 'name image')
        .populate('train', 'number name')
        .populate('boardingStation', 'code name city')
        .populate('deliveryStation', 'code name city')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { orders },
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name mobile')
      .populate('restaurant', 'name image')
      .populate('train', 'number name')
      .populate('boardingStation', 'code name city')
      .populate('deliveryStation', 'code name city')
      .populate('items.foodItem', 'name image');

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const isOwner = order.user.toString() === req.user?._id;
    const isRestaurantOwner = req.user?.role === 'restaurant';
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isRestaurantOwner && !isAdmin) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    res.json({ success: true, data: { order } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, note } = req.body as { status: string; note?: string };
    const validStatuses = ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }

    if (!['restaurant', 'admin'].includes(req.user?.role || '')) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    order.status = status as never;
    order.statusHistory.push({ status: status as never, timestamp: new Date(), note });
    await order.save();

    const populated = await Order.findById(order._id)
      .populate('user', 'name mobile')
      .populate('restaurant', 'name');

    try {
      const io = getIO();
      io.to(`user:${order.user}`).emit('order:status', { orderId: order._id, status, note });
      io.to('admin').emit('order:status', { orderId: order._id, status });
    } catch {
      // Socket not critical
    }

    res.json({ success: true, data: { order: populated } });
  } catch {
    res.status(500).json({ success: false, error: 'Status update failed' });
  }
});

// GET /api/orders/restaurant/:restaurantId (for restaurant dashboard)
router.get(
  '/restaurant/:restaurantId',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!['restaurant', 'admin'].includes(req.user?.role || '')) {
        res.status(403).json({ success: false, error: 'Not authorized' });
        return;
      }

      const { status, page = '1' } = req.query as Record<string, string>;
      const filter: Record<string, unknown> = { restaurant: req.params.restaurantId };
      if (status) filter.status = status;

      const orders = await Order.find(filter)
        .populate('user', 'name mobile')
        .populate('train', 'number name')
        .populate('boardingStation', 'code name')
        .populate('deliveryStation', 'code name')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * 20)
        .limit(20);

      res.json({ success: true, data: { orders } });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to fetch restaurant orders' });
    }
  }
);

// POST /api/orders/:id/review
router.post('/:id/review', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rating, comment } = req.body as { rating: number; comment?: string };
    const order = await Order.findById(req.params.id);

    if (!order || order.user.toString() !== req.user?._id) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    if (order.status !== 'delivered') {
      res.status(400).json({ success: false, error: 'Can only review delivered orders' });
      return;
    }

    const { Review } = await import('../models/Review');
    const review = await Review.create({
      user: req.user._id,
      restaurant: order.restaurant,
      order: order._id,
      rating,
      comment,
    });

    // Update restaurant rating
    const { Restaurant: RestaurantModel } = await import('../models/Restaurant');
    const restaurant = await RestaurantModel.findById(order.restaurant);
    if (restaurant) {
      const newTotal = restaurant.totalRatings + 1;
      const newRating = (restaurant.rating * restaurant.totalRatings + rating) / newTotal;
      restaurant.rating = Math.round(newRating * 10) / 10;
      restaurant.totalRatings = newTotal;
      await restaurant.save();
    }

    res.status(201).json({ success: true, data: { review } });
  } catch (err: unknown) {
    const error = err as { code?: number; message: string };
    if (error.code === 11000) {
      res.status(400).json({ success: false, error: 'You already reviewed this order' });
      return;
    }
    res.status(500).json({ success: false, error: 'Review failed' });
  }
});

export default router;
