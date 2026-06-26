import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';

try {
  const src = "C:\\Users\\HP\\.gemini\\antigravity\\brain\\8b0a7a6d-52dd-4d5a-b6d4-2a2ace891ab0\\media__1782293158940.png";
  const dest = "e:\\Smart Coffee Supply Chain Management System 2\\frontend\\public\\impexcor_logo.png";
  if (fs.existsSync(src)) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log('[server]: Copied company logo successfully');
  }
} catch (e) {
  console.error('[server]: Failed to copy logo', e);
}

import authRoutes from './routes/authRoutes';
import farmerRoutes from './routes/farmerRoutes';
import aggregatorRoutes from './routes/aggregatorRoutes';
import processorRoutes from './routes/processorRoutes';
import qcRoutes from './routes/qcRoutes';
import exportRoutes from './routes/exportRoutes';
import traceabilityRoutes from './routes/traceabilityRoutes';
import adminRoutes from './routes/adminRoutes';
import notificationRoutes from './routes/notificationRoutes';
import paymentRoutes from './routes/paymentRoutes';
import customerRoutes from './routes/customerRoutes';
import reportRoutes from './routes/reportRoutes';
import { authenticate, requireRole } from './middlewares/authMiddleware';
import { getPriceTrends } from './controllers/farmerController';
import prisma from './config/db';
import { assertJwtConfiguration } from './utils/jwt';

assertJwtConfiguration();

const app: Express = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/aggregators', aggregatorRoutes);
app.use('/api/processors', processorRoutes);
app.use('/api/qc', qcRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/traceability', traceabilityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/reports', reportRoutes);
app.get('/api/market-prices', authenticate, requireRole(['AGGREGATOR']), getPriceTrends);

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the Smart Coffee Supply Chain API' });
});

const server = app.listen(Number(port), () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

const shutdown = (signal: string) => {
  console.log(`[server]: ${signal} received. Shutting down.`);
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => {
    void prisma.$disconnect().finally(() => process.exit(1));
  }, 10_000).unref();
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
