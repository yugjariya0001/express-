import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';

import { connectDB } from './config/db';
import { env } from './config/env';
import { apiRateLimit } from './middleware/rateLimit';
import { initSocket } from './socket';

import authRoutes from './routes/auth';
import trainRoutes from './routes/trains';
import restaurantRoutes from './routes/restaurants';
import orderRoutes from './routes/orders';
import paymentRoutes from './routes/payments';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing - use raw for webhook
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Other middleware
app.use(cookieParser());
app.use(compression());

// Rate limiting
app.use('/api', apiRateLimit);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: env.NODE_ENV });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trains', trainRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// Start server
const start = async () => {
  await connectDB();
  server.listen(env.PORT, () => {
    console.log(`🚂 Express Tadka API running on port ${env.PORT} [${env.NODE_ENV}]`);
    console.log(`📡 Socket.IO ready`);
  });
};

start().catch(console.error);

export default app;
