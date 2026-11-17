import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import userRoutes from './routes/user';
import { authenticateToken, requireAdmin, requireUser } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', authenticateToken, requireAdmin, adminRoutes);
app.use('/api/user', authenticateToken, requireUser, userRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// Serve frontend static build files in production
const possibleDistPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../../../client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
];

const clientDist = possibleDistPaths.find((p) => fs.existsSync(p));

if (clientDist) {
  console.log(`📦 Serving static client from: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server çalışıyor: http://localhost:${PORT}`);
  });
}

export default app;
