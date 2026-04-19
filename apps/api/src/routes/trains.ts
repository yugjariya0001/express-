import { Router, Request, Response } from 'express';
import { Train } from '../models/Train';
import { Station } from '../models/Station';

const router = Router();

const PASSENGER_NAMES = [
  'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sunita Verma',
  'Vikram Singh', 'Meena Gupta', 'Suresh Yadav', 'Kavita Joshi',
  'Rahul Mehta', 'Anita Reddy',
];

const SEAT_CLASSES = ['1A', '2A', '3A', 'SL', 'CC', 'EC', '2S'];

// GET /api/trains/search
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query as { q?: string };
    if (!q || q.trim().length < 2) {
      res.status(400).json({ success: false, error: 'Query must be at least 2 characters' });
      return;
    }

    const trains = await Train.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { number: { $regex: q, $options: 'i' } },
      ],
    })
      .populate('from', 'code name city')
      .populate('to', 'code name city')
      .populate('schedule.station', 'code name city')
      .limit(20);

    res.json({ success: true, data: { trains } });
  } catch {
    res.status(500).json({ success: false, error: 'Train search failed' });
  }
});

// GET /api/trains/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const train = await Train.findById(req.params.id)
      .populate('from', 'code name city state')
      .populate('to', 'code name city state')
      .populate('schedule.station', 'code name city state');

    if (!train) {
      res.status(404).json({ success: false, error: 'Train not found' });
      return;
    }

    res.json({ success: true, data: { train } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get train' });
  }
});

// POST /api/trains/pnr - Mock PNR lookup
router.post('/pnr', async (req: Request, res: Response): Promise<void> => {
  try {
    const { pnr } = req.body as { pnr?: string };
    if (!pnr || !/^\d{10}$/.test(pnr)) {
      res.status(400).json({ success: false, error: 'Invalid PNR format (must be 10 digits)' });
      return;
    }

    // Deterministic mock based on PNR digits
    const trainIndex = parseInt(pnr[0]) % 5;
    const trains = await Train.find()
      .populate('from', 'code name city')
      .populate('to', 'code name city')
      .populate('schedule.station', 'code name city')
      .limit(5);

    if (!trains.length) {
      res.status(404).json({ success: false, error: 'No trains in system. Please run the seed script.' });
      return;
    }

    const train = trains[trainIndex % trains.length];
    const nameIndex = parseInt(pnr[1]) % PASSENGER_NAMES.length;
    const seatIndex = parseInt(pnr[2]) % SEAT_CLASSES.length;

    // Journey date: next occurrence within 7 days
    const journeyDate = new Date();
    journeyDate.setDate(journeyDate.getDate() + (parseInt(pnr[3]) % 7));

    const fromStation = train.from as unknown as { code: string; name: string; city: string };
    const toStation = train.to as unknown as { code: string; name: string; city: string };

    res.json({
      success: true,
      data: {
        pnr,
        trainNumber: train.number,
        trainName: train.name,
        journeyDate: journeyDate.toISOString().split('T')[0],
        from: fromStation?.code || 'NDLS',
        to: toStation?.code || 'MMCT',
        passengerName: PASSENGER_NAMES[nameIndex],
        seatClass: SEAT_CLASSES[seatIndex],
        schedule: train.schedule,
        trainId: train._id,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'PNR lookup failed' });
  }
});

// GET /api/trains (list all)
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const trains = await Train.find()
      .populate('from', 'code name city')
      .populate('to', 'code name city')
      .limit(50);
    res.json({ success: true, data: { trains } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to list trains' });
  }
});

// GET /api/trains/stations/list
router.get('/stations/list', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stations = await Station.find().sort({ name: 1 });
    res.json({ success: true, data: { stations } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to list stations' });
  }
});

export default router;
