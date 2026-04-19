import { Router, Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';
import { FoodItem } from '../models/FoodItem';
import { Review } from '../models/Review';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/restaurants?station=xxx&cuisine=xxx&veg=true
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { station, cuisine, veg, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { isActive: true };

    if (station) {
      filter.stations = station;
    }

    if (cuisine) {
      filter.cuisine = { $in: cuisine.split(',') };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = Restaurant.find(filter)
      .populate('stations', 'code name city')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ rating: -1 });

    const [restaurants, total] = await Promise.all([
      query,
      Restaurant.countDocuments(filter),
    ]);

    // Filter veg after population if needed (applied at food item level)
    res.json({
      success: true,
      data: { restaurants },
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch restaurants' });
  }
});

// GET /api/restaurants/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('stations', 'code name city state')
      .populate('owner', 'name mobile');

    if (!restaurant) {
      res.status(404).json({ success: false, error: 'Restaurant not found' });
      return;
    }

    res.json({ success: true, data: { restaurant } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch restaurant' });
  }
});

// GET /api/restaurants/:id/menu
router.get('/:id/menu', async (req: Request, res: Response): Promise<void> => {
  try {
    const { veg } = req.query as { veg?: string };
    const filter: Record<string, unknown> = {
      restaurant: req.params.id,
      isAvailable: true,
    };
    if (veg === 'true') filter.isVeg = true;
    if (veg === 'false') filter.isVeg = false;

    const items = await FoodItem.find(filter).sort({ category: 1, name: 1 });

    // Group by category
    const menu: Record<string, typeof items> = {};
    items.forEach((item) => {
      if (!menu[item.category]) menu[item.category] = [];
      menu[item.category].push(item);
    });

    res.json({ success: true, data: { menu, items } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch menu' });
  }
});

// GET /api/restaurants/:id/reviews
router.get('/:id/reviews', async (req: Request, res: Response): Promise<void> => {
  try {
    const reviews = await Review.find({ restaurant: req.params.id })
      .populate('user', 'name mobile')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, data: { reviews } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
  }
});

// POST /api/restaurants (admin only)
router.post('/', authenticate, authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurant = await Restaurant.create(req.body);
    res.status(201).json({ success: true, data: { restaurant } });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

// PUT /api/restaurants/:id (owner or admin)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'Restaurant not found' });
      return;
    }

    const isOwner = restaurant.owner.toString() === req.user?._id;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    const updated = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: { restaurant: updated } });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/restaurants/:id/food-items
router.post(
  '/:id/food-items',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const restaurant = await Restaurant.findById(req.params.id);
      if (!restaurant) {
        res.status(404).json({ success: false, error: 'Restaurant not found' });
        return;
      }

      const isOwner = restaurant.owner.toString() === req.user?._id;
      const isAdmin = req.user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        res.status(403).json({ success: false, error: 'Not authorized' });
        return;
      }

      const foodItem = await FoodItem.create({ ...req.body, restaurant: req.params.id });
      res.status(201).json({ success: true, data: { foodItem } });
    } catch (err: unknown) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  }
);

// PUT /api/restaurants/:id/food-items/:itemId
router.put(
  '/:id/food-items/:itemId',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const restaurant = await Restaurant.findById(req.params.id);
      if (!restaurant) {
        res.status(404).json({ success: false, error: 'Restaurant not found' });
        return;
      }

      const isOwner = restaurant.owner.toString() === req.user?._id;
      const isAdmin = req.user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        res.status(403).json({ success: false, error: 'Not authorized' });
        return;
      }

      const item = await FoodItem.findByIdAndUpdate(req.params.itemId, req.body, { new: true });
      res.json({ success: true, data: { foodItem: item } });
    } catch (err: unknown) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  }
);

// DELETE /api/restaurants/:id/food-items/:itemId
router.delete(
  '/:id/food-items/:itemId',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const restaurant = await Restaurant.findById(req.params.id);
      if (!restaurant) {
        res.status(404).json({ success: false, error: 'Restaurant not found' });
        return;
      }

      const isOwner = restaurant.owner.toString() === req.user?._id;
      const isAdmin = req.user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        res.status(403).json({ success: false, error: 'Not authorized' });
        return;
      }

      await FoodItem.findByIdAndDelete(req.params.itemId);
      res.json({ success: true, message: 'Food item deleted' });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to delete food item' });
    }
  }
);

export default router;
