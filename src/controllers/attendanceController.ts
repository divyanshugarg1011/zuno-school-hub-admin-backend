import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database';
import { Attendance, AttendanceCreateDto, AttendanceUpdateDto, AttendanceReport } from '../models/Attendance';
import { Student } from '../models/Student';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

export class AttendanceController {
  
  getAttendance = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc', date, studentId, status } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const db = getDB();
    const filter: any = {};
    
    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }
    
    if (studentId) {
      filter.studentId = new ObjectId(studentId as string);
    }
    
    if (status) {
      filter.status = status;
    }
    
    const attendance = await db.collection<Attendance>('attendance')
      .find(filter)
      .sort({ [sortBy as string]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .toArray();
    
    const total = await db.collection<Attendance>('attendance').countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        attendance,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  });

  getAttendanceById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    const attendance = await db.collection<Attendance>('attendance').findOne({ _id: new ObjectId(id) });
    
    if (!attendance) {
      throw createError('Attendance record not found', 404);
    }
    
    res.json({
      success: true,
      data: attendance
    });
  });

  markAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { studentId, date, status, checkInTime, checkOutTime, notes }: AttendanceCreateDto = req.body;
    
    const db = getDB();
    
    // Check if student exists
    const student = await db.collection<Student>('students').findOne({ _id: new ObjectId(studentId) });
    if (!student) {
      throw createError('Student not found', 404);
    }
    
    // Check if attendance already exists for this student and date
    const existingAttendance = await db.collection<Attendance>('attendance').findOne({
      studentId: new ObjectId(studentId),
      date: new Date(date)
    });
    
    if (existingAttendance) {
      throw createError('Attendance already marked for this student on this date', 400);
    }
    
    const newAttendance: Attendance = {
      studentId: new ObjectId(studentId),
      date: new Date(date),
      status,
      checkInTime: checkInTime ? new Date(checkInTime) : undefined,
      checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
      notes,
      markedBy: req.user!.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection<Attendance>('attendance').insertOne(newAttendance);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newAttendance
      }
    });
  });

  updateAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updateData: AttendanceUpdateDto = req.body;
    
    const db = getDB();
    
    const result = await db.collection<Attendance>('attendance').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Attendance record not found', 404);
    }
    
    const updatedAttendance = await db.collection<Attendance>('attendance').findOne({ _id: new ObjectId(id) });
    
    res.json({
      success: true,
      data: updatedAttendance
    });
  });

  deleteAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    
    const result = await db.collection<Attendance>('attendance').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      throw createError('Attendance record not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  });

  getStudentAttendance = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;
    
    const db = getDB();
    const filter: any = { studentId: new ObjectId(studentId) };
    
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }
    
    const attendance = await db.collection<Attendance>('attendance')
      .find(filter)
      .sort({ date: -1 })
      .toArray();
    
    res.json({
      success: true,
      data: attendance
    });
  });

  getClassAttendance = asyncHandler(async (req: Request, res: Response) => {
    const { className } = req.params;
    const { date, section } = req.query;
    
    const db = getDB();
    
    // Get students from the class
    const studentFilter: any = { class: className, isActive: true };
    if (section) {
      studentFilter.section = section;
    }
    
    const students = await db.collection<Student>('students').find(studentFilter).toArray();
    const studentIds = students.map(s => s._id);
    
    const attendanceFilter: any = {
      studentId: { $in: studentIds }
    };
    
    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      attendanceFilter.date = { $gte: startDate, $lt: endDate };
    }
    
    const attendance = await db.collection<Attendance>('attendance')
      .find(attendanceFilter)
      .sort({ date: -1 })
      .toArray();
    
    res.json({
      success: true,
      data: {
        students,
        attendance
      }
    });
  });

  getAttendanceByDate = asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.params;
    
    const db = getDB();
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    
    const attendance = await db.collection<Attendance>('attendance')
      .find({
        date: { $gte: startDate, $lt: endDate }
      })
      .sort({ studentId: 1 })
      .toArray();
    
    res.json({
      success: true,
      data: attendance
    });
  });

  getAttendanceReport = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;
    
    const db = getDB();
    
    const matchFilter: any = {
      studentId: new ObjectId(studentId)
    };
    
    if (startDate && endDate) {
      matchFilter.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }
    
    const report = await db.collection<Attendance>('attendance').aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$studentId',
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          excusedDays: { $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $project: {
          studentId: '$_id',
          studentName: { $concat: [{ $arrayElemAt: ['$student.firstName', 0] }, ' ', { $arrayElemAt: ['$student.lastName', 0] }] },
          totalDays: 1,
          presentDays: 1,
          absentDays: 1,
          lateDays: 1,
          excusedDays: 1,
          attendancePercentage: {
            $multiply: [
              { $divide: ['$presentDays', '$totalDays'] },
              100
            ]
          }
        }
      }
    ]).toArray();
    
    res.json({
      success: true,
      data: report[0] || null
    });
  });

  bulkMarkAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { attendanceRecords } = req.body;
    
    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      throw createError('Attendance records array is required', 400);
    }
    
    const db = getDB();
    
    const bulkOps = attendanceRecords.map(record => ({
      insertOne: {
        document: {
          ...record,
          studentId: new ObjectId(record.studentId),
          date: new Date(record.date),
          markedBy: req.user!.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    }));
    
    const result = await db.collection<Attendance>('attendance').bulkWrite(bulkOps);
    
    res.json({
      success: true,
      data: {
        insertedCount: result.insertedCount,
        message: `${result.insertedCount} attendance records marked successfully`
      }
    });
  });
}
