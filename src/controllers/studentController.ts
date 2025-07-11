import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database';
import { Student, StudentCreateDto, StudentUpdateDto } from '../models/Student';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

export class StudentController {
  
  getStudents = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const db = getDB();
    const students = await db.collection<Student>('students')
      .find({ isActive: true })
      .sort({ [sortBy as string]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .toArray();
    
    const total = await db.collection<Student>('students').countDocuments({ isActive: true });
    
    res.json({
      success: true,
      data: {
        students,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  });

  getStudent = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    const student = await db.collection<Student>('students').findOne({ _id: new ObjectId(id) });
    
    if (!student) {
      throw createError('Student not found', 404);
    }
    
    res.json({
      success: true,
      data: student
    });
  });

  createStudent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const studentData: StudentCreateDto = req.body;
    
    const db = getDB();
    
    // Check if student ID already exists
    const existingStudent = await db.collection<Student>('students').findOne({ 
      studentId: studentData.studentId 
    });
    
    if (existingStudent) {
      throw createError('Student ID already exists', 400);
    }
    
    // Check if roll number already exists in the same class and section
    const existingRollNumber = await db.collection<Student>('students').findOne({
      class: studentData.class,
      section: studentData.section,
      rollNumber: studentData.rollNumber
    });
    
    if (existingRollNumber) {
      throw createError('Roll number already exists in this class and section', 400);
    }
    
    const newStudent: Student = {
      ...studentData,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection<Student>('students').insertOne(newStudent);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newStudent
      }
    });
  });

  updateStudent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updateData: StudentUpdateDto = req.body;
    
    const db = getDB();
    
    const result = await db.collection<Student>('students').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Student not found', 404);
    }
    
    const updatedStudent = await db.collection<Student>('students').findOne({ _id: new ObjectId(id) });
    
    res.json({
      success: true,
      data: updatedStudent
    });
  });

  deleteStudent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    
    const result = await db.collection<Student>('students').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          isActive: false,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Student not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  });

  getStudentsByClass = asyncHandler(async (req: Request, res: Response) => {
    const { className } = req.params;
    const { section } = req.query;
    
    const db = getDB();
    const filter: any = { class: className, isActive: true };
    
    if (section) {
      filter.section = section;
    }
    
    const students = await db.collection<Student>('students')
      .find(filter)
      .sort({ rollNumber: 1 })
      .toArray();
    
    res.json({
      success: true,
      data: students
    });
  });

  searchStudents = asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query;
    
    if (!q) {
      throw createError('Search query required', 400);
    }
    
    const db = getDB();
    const students = await db.collection<Student>('students')
      .find({
        $and: [
          { isActive: true },
          {
            $or: [
              { firstName: { $regex: q as string, $options: 'i' } },
              { lastName: { $regex: q as string, $options: 'i' } },
              { studentId: { $regex: q as string, $options: 'i' } },
              { rollNumber: { $regex: q as string, $options: 'i' } }
            ]
          }
        ]
      })
      .limit(20)
      .toArray();
    
    res.json({
      success: true,
      data: students
    });
  });

  uploadPhoto = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    
    // In a real application, you would handle file upload here
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Photo uploaded successfully'
    });
  });
}
