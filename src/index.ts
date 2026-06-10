import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import shipmentRoutes from './routes/shipments';
import accountingRoutes from './routes/accounting';
import restaurantRoutes from './routes/restaurants';
import { initDB } from './db';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
initDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/restaurants', restaurantRoutes);  // <-- أضف هذا

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: true
  }
});

// Store connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);

  socket.on('join', (userId: number) => {
    connectedUsers.set(socket.id, userId);
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room user_${userId}`);
  });

  socket.on('disconnect', () => {
    const userId = connectedUsers.get(socket.id);
    if (userId) {
      console.log(`🔴 User ${userId} disconnected`);
      connectedUsers.delete(socket.id);
    }
  });
});

// Export io for use in other files
export const notifyUser = (userId: number, notification: {
  title: string;
  message: string;
  type: string;
  related_id?: number;
}) => {
  io.to(`user_${userId}`).emit('notification', {
    ...notification,
    id: Date.now(),
    created_at: new Date().toISOString()
  });
};

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ WebSocket server running on ws://localhost:${PORT}`);
});
