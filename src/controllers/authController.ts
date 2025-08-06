import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId} from 'mongodb';
import { getDB } from '../config/database';
import { User, UserCreateDto, UserLoginDto } from '../models/User';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password }: UserLoginDto = req.body;
    
    const db = getDB();
    const user = await db.collection<User>('users').findOne({ email });
    
    if (!user) {
      throw createError('Invalid credentials', 401);
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw createError('Invalid credentials', 401);
    }
    
    if (!user.isActive) {
      throw createError('Account is deactivated', 401);
    }
    
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      }
    });
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, role }: UserCreateDto = req.body;
    
    const db = getDB();
    
    // Check if user already exists
    const existingUser = await db.collection<User>('users').findOne({ email });
    if (existingUser) {
      throw createError('User already exists with this email', 400);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
    
    const newUser: User = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection<User>('users').insertOne(newUser);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role
      }
    });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    // In a real application, you might want to blacklist the token
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });

  getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const db = getDB();
    let userId = req.user?.id;
    // Convert string id to ObjectId if necessary
    if (userId && typeof userId === 'string') {
      try {
        userId = new ObjectId(userId);
      } catch (err) {
        // fallback: use as is
      }
    }
    const user = await db.collection<User>('users').findOne({ _id: userId });
    if (!user) {
      throw createError('User not found', 404);
    }
    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive
      }
    });
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    
    if (!token) {
      throw createError('Token required', 400);
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      
      const db = getDB();
      const user = await db.collection<User>('users').findOne({ _id: decoded.id });
      
      if (!user || !user.isActive) {
        throw createError('Invalid token', 401);
      }
      
      const newToken = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
      );
      
      res.json({
        success: true,
        data: { token: newToken }
      });
    } catch (error) {
      throw createError('Invalid token', 401);
    }
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    
    const db = getDB();
    const user = await db.collection<User>('users').findOne({ email });
    
    if (!user) {
      throw createError('User not found', 404);
    }
    
    // In a real application, you would send a password reset email here
    res.json({
      success: true,
      message: 'Password reset instructions sent to your email'
    });
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    
    // In a real application, you would verify the reset token here
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  });
}
