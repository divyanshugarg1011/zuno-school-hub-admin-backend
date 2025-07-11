import { Request, Response } from 'express';
import { getDB } from '../config/database';
import { Teacher, TeacherCreateDto, TeacherUpdateDto } from '../models/Teacher';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

export class TeacherController {
  
  getAllTeachers = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const teachers = await db.collection<Teacher>('teachers')
      .find({ isActive: true })
      .skip(skip)
      .limit(limit)
      .toArray();
      
    const total = await db.collection<Teacher>('teachers').countDocuments({ isActive: true });
    
    res.json({
      success: true,
      data: {
        teachers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  getTeacherById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    const teacher = await db.collection<Teacher>('teachers').findOne({ _id: id as any });
    
    if (!teacher) {
      throw createError('Teacher not found', 404);
    }
    
    res.json({
      success: true,
      data: teacher
    });
  });

  createTeacher = asyncHandler(async (req: Request, res: Response) => {
    const teacherData: TeacherCreateDto = req.body;
    
    const db = getDB();
    
    // Check if teacher already exists
    const existingTeacher = await db.collection<Teacher>('teachers').findOne({ email: teacherData.email });
    if (existingTeacher) {
      throw createError('Teacher already exists with this email', 400);
    }
    
    const newTeacher: Teacher = {
      ...teacherData,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection<Teacher>('teachers').insertOne(newTeacher);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newTeacher
      }
    });
  });

  updateTeacher = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: TeacherUpdateDto = req.body;
    
    const db = getDB();
    
    const result = await db.collection<Teacher>('teachers').updateOne(
      { _id: id as any },
      { 
        $set: { 
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Teacher not found', 404);
    }
    
    const updatedTeacher = await db.collection<Teacher>('teachers').findOne({ _id: id as any });
    
    res.json({
      success: true,
      data: updatedTeacher
    });
  });

  deleteTeacher = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    
    const result = await db.collection<Teacher>('teachers').updateOne(
      { _id: id as any },
      { 
        $set: { 
          isActive: false,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Teacher not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  });

  getTeachersBySubject = asyncHandler(async (req: Request, res: Response) => {
    const { subject } = req.params;
    
    const db = getDB();
    const teachers = await db.collection<Teacher>('teachers')
      .find({ 
        subjects: { $in: [subject] },
        isActive: true 
      })
      .toArray();
    
    res.json({
      success: true,
      data: teachers
    });
  });

  getTeachersByClass = asyncHandler(async (req: Request, res: Response) => {
    const { classId } = req.params;
    
    const db = getDB();
    const teachers = await db.collection<Teacher>('teachers')
      .find({ 
        classes: { $in: [classId] },
        isActive: true 
      })
      .toArray();
    
    res.json({
      success: true,
      data: teachers
    });
  });

  uploadTeacherPhoto = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!req.file) {
      throw createError('No file uploaded', 400);
    }
    
    const db = getDB();
    const photoUrl = `/uploads/teachers/${req.file.filename}`;
    
    const result = await db.collection<Teacher>('teachers').updateOne(
      { _id: id as any },
      { 
        $set: { 
          photo: photoUrl,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Teacher not found', 404);
    }
    
    res.json({
      success: true,
      data: { photoUrl }
    });
  });

  assignClassToTeacher = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { classId } = req.body;
    
    const db = getDB();
    
    const result = await db.collection<Teacher>('teachers').updateOne(
      { _id: id as any },
      { 
        $addToSet: { classes: classId },
        $set: { updatedAt: new Date() }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Teacher not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Class assigned to teacher successfully'
    });
  });

  removeClassFromTeacher = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { classId } = req.body;
    
    const db = getDB();
    
    const result = await db.collection<Teacher>('teachers').updateOne(
      { _id: id as any },
      { 
        $pull: { classes: classId },
        $set: { updatedAt: new Date() }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Teacher not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Class removed from teacher successfully'
    });
  });
}

export default TeacherController;
