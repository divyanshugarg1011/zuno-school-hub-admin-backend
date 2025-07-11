import { Request, Response } from 'express';
import { getDB } from '../config/database';
import { Homework, HomeworkCreateDto, HomeworkUpdateDto } from '../models/Homework';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

export class HomeworkController {
  
  getAllHomework = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const homework = await db.collection<Homework>('homework')
      .find({})
      .skip(skip)
      .limit(limit)
      .toArray();
      
    const total = await db.collection<Homework>('homework').countDocuments({});
    
    res.json({
      success: true,
      data: {
        homework,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  getHomeworkById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    const homework = await db.collection<Homework>('homework').findOne({ _id: id as any });
    
    if (!homework) {
      throw createError('Homework not found', 404);
    }
    
    res.json({
      success: true,
      data: homework
    });
  });

  createHomework = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const homeworkData: HomeworkCreateDto = req.body;
    
    const db = getDB();
    
    const newHomework: Homework = {
      ...homeworkData,
      assignedBy: req.user!.id,
      assignedDate: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection<Homework>('homework').insertOne(newHomework);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newHomework
      }
    });
  });

  updateHomework = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: HomeworkUpdateDto = req.body;
    
    const db = getDB();
    
    const result = await db.collection<Homework>('homework').updateOne(
      { _id: id as any },
      { 
        $set: { 
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Homework not found', 404);
    }
    
    const updatedHomework = await db.collection<Homework>('homework').findOne({ _id: id as any });
    
    res.json({
      success: true,
      data: updatedHomework
    });
  });

  deleteHomework = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    
    const result = await db.collection<Homework>('homework').deleteOne({ _id: id as any });
    
    if (result.deletedCount === 0) {
      throw createError('Homework not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Homework deleted successfully'
    });
  });

  getHomeworkByClass = asyncHandler(async (req: Request, res: Response) => {
    const { classId } = req.params;
    
    const db = getDB();
    const homework = await db.collection<Homework>('homework')
      .find({ classId })
      .toArray();
    
    res.json({
      success: true,
      data: homework
    });
  });

  getHomeworkBySubject = asyncHandler(async (req: Request, res: Response) => {
    const { subject } = req.params;
    
    const db = getDB();
    const homework = await db.collection<Homework>('homework')
      .find({ subject })
      .toArray();
    
    res.json({
      success: true,
      data: homework
    });
  });

  getHomeworkByTeacher = asyncHandler(async (req: Request, res: Response) => {
    const { teacherId } = req.params;
    
    const db = getDB();
    const homework = await db.collection<Homework>('homework')
      .find({ teacherId })
      .toArray();
    
    res.json({
      success: true,
      data: homework
    });
  });

  submitHomework = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { studentId, submission } = req.body;
    
    const db = getDB();
    
    const result = await db.collection<Homework>('homework').updateOne(
      { _id: id as any },
      { 
        $push: { 
          submissions: {
            studentId,
            ...submission,
            submittedAt: new Date()
          }
        },
        $set: { updatedAt: new Date() }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Homework not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Homework submitted successfully'
    });
  });

  gradeHomework = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { studentId, grade, feedback } = req.body;
    
    const db = getDB();
    
    const result = await db.collection<Homework>('homework').updateOne(
      { 
        _id: id as any,
        'submissions.studentId': studentId
      },
      { 
        $set: { 
          'submissions.$.grade': grade,
          'submissions.$.feedback': feedback,
          'submissions.$.gradedAt': new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Homework or submission not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Homework graded successfully'
    });
  });

  getHomeworkDueToday = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const homework = await db.collection<Homework>('homework')
      .find({ 
        dueDate: { 
          $gte: startOfDay,
          $lte: endOfDay
        }
      })
      .toArray();
    
    res.json({
      success: true,
      data: homework
    });
  });

  getOverdueHomework = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const today = new Date();
    
    const homework = await db.collection<Homework>('homework')
      .find({ 
        dueDate: { $lt: today }
      })
      .toArray();
    
    res.json({
      success: true,
      data: homework
    });
  });

  uploadHomeworkFile = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!req.file) {
      throw createError('No file uploaded', 400);
    }
    
    const db = getDB();
    const fileUrl = `/uploads/homework/${req.file.filename}`;
    
    const result = await db.collection<Homework>('homework').updateOne(
      { _id: id as any },
      { 
        $push: { attachments: fileUrl },
        $set: { updatedAt: new Date() }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Homework not found', 404);
    }
    
    res.json({
      success: true,
      data: { fileUrl }
    });
  });
}

export default HomeworkController;
