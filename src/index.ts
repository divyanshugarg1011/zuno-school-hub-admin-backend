import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import authRoutes from './routes/auth';
import studentRoutes from './routes/students';
import teacherRoutes from './routes/teachers';
import attendanceRoutes from './routes/attendance';
import homeworkRoutes from './routes/homework';
import feeRoutes from './routes/fees';
import communicationRoutes from './routes/communication';
import reportRoutes from './routes/reports';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/students', authenticateToken, studentRoutes);
app.use('/api/teachers', authenticateToken, teacherRoutes);
app.use('/api/attendance', authenticateToken, attendanceRoutes);
app.use('/api/homework', authenticateToken, homeworkRoutes);
app.use('/api/fees', authenticateToken, feeRoutes);
app.use('/api/communication', authenticateToken, communicationRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // Start server anyway, even if database connection fails
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (without database connection)`);
    });
  }
};

startServer();
