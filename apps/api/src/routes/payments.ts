import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { Order } from '../models/Order';
import { authenticate, AuthRequest } from '../middleware/auth';
import { paymentRateLimit } from '../middleware/rateLimit';
import { env } from '../config/env';

const router = Router();

// Lazy load Razorpay to avoid startup errors when key is not set
const getRazorpay = () => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Razorpay = require('razorpay');
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
};

// POST /api/payments/create-order
router.post(
  '/create-order',
  paymentRateLimit,
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { orderId } = req.body as { orderId: string };

      const order = await Order.findById(orderId);
      if (!order || order.user.toString() !== req.user?._id) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      if (order.payment.status === 'paid') {
        res.status(400).json({ success: false, error: 'Order already paid' });
        return;
      }

      const razorpay = getRazorpay();
      if (!razorpay) {
        // Mock response for development without Razorpay credentials
        const mockOrderId = `order_mock_${Date.now()}`;
        order.payment.razorpayOrderId = mockOrderId;
        await order.save();
        res.json({
          success: true,
          data: {
            razorpayOrderId: mockOrderId,
            amount: order.finalAmount * 100,
            currency: 'INR',
            key: 'rzp_test_mock',
            mock: true,
          },
        });
        return;
      }

      const razorpayOrder = await razorpay.orders.create({
        amount: order.finalAmount * 100,
        currency: 'INR',
        receipt: orderId,
        notes: { orderId },
      });

      order.payment.razorpayOrderId = razorpayOrder.id;
      await order.save();

      res.json({
        success: true,
        data: {
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: env.RAZORPAY_KEY_ID,
        },
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
);

// POST /api/payments/verify
router.post(
  '/verify',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        orderId,
      } = req.body as {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
        orderId: string;
      };

      // For mock payments in dev
      if (razorpayOrderId?.startsWith('order_mock_')) {
        const order = await Order.findById(orderId);
        if (!order) {
          res.status(404).json({ success: false, error: 'Order not found' });
          return;
        }
        order.payment.status = 'paid';
        order.payment.razorpayPaymentId = razorpayPaymentId || 'pay_mock';
        order.status = 'placed';
        await order.save();
        res.json({ success: true, message: 'Payment verified (mock)' });
        return;
      }

      // Verify Razorpay signature
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        res.status(400).json({ success: false, error: 'Invalid payment signature' });
        return;
      }

      const order = await Order.findById(orderId);
      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      order.payment.status = 'paid';
      order.payment.razorpayPaymentId = razorpayPaymentId;
      order.status = 'confirmed';
      order.statusHistory.push({ status: 'confirmed', timestamp: new Date(), note: 'Payment received' });
      await order.save();

      res.json({ success: true, message: 'Payment verified successfully' });
    } catch {
      res.status(500).json({ success: false, error: 'Payment verification failed' });
    }
  }
);

// POST /api/payments/webhook
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);

    if (env.RAZORPAY_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      if (expectedSignature !== signature) {
        res.status(400).json({ success: false, error: 'Invalid webhook signature' });
        return;
      }
    }

    const event = req.body as { event: string; payload: { payment: { entity: { notes: { orderId: string }; id: string } } } };

    if (event.event === 'payment.captured') {
      const orderId = event.payload?.payment?.entity?.notes?.orderId;
      const paymentId = event.payload?.payment?.entity?.id;

      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          'payment.status': 'paid',
          'payment.razorpayPaymentId': paymentId,
          status: 'confirmed',
          $push: {
            statusHistory: { status: 'confirmed', timestamp: new Date(), note: 'Payment captured via webhook' },
          },
        });
      }
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

export default router;
