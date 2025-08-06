import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database';
import { Attendance, AttendanceCreateDto, AttendanceUpdateDto, AttendanceReport } from '../models/Attendance';
import { Student } from '../models/Student';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';

export class AttendanceController {
  
  getAttendance = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc', date, studentId, status } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const db = getDB();
    const matchFilter: any = {};
    
    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      matchFilter.date = { $gte: startDate, $lt: endDate };
    }
    
    if (studentId) {
      matchFilter.studentId = new ObjectId(studentId as string);
    }
    
    if (status) {
      matchFilter.status = status;
    }
    
    // Create aggregation pipeline
    const pipeline: any[] = [
      { $match: matchFilter },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $unwind: {
          path: '$student',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          studentName: {
            $concat: [
              { $ifNull: ['$student.firstName', ''] },
              ' ',
              { $ifNull: ['$student.lastName', ''] }
            ]
          },
          rollNo: { 
            $ifNull: [
              '$student.rollNumber', 
              { $ifNull: ['$student.studentId', 'N/A'] }
            ]
          },
          class: { $ifNull: ['$student.class', 'N/A'] },
          section: { $ifNull: ['$student.section', ''] },
          status: 1,
          remarks: { $ifNull: ['$notes', ''] },
          date: 1,
          checkInTime: 1,
          checkOutTime: 1,
          markedBy: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ];

    // Add sorting
    const sortField = sortBy === 'studentName' ? 'studentName' : sortBy as string;
    pipeline.push({ $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 } });

    // Get total count for pagination
    const totalPipeline = [...pipeline];
    totalPipeline.push({ $count: 'total' });
    const totalResult = await db.collection<Attendance>('attendance').aggregate(totalPipeline).toArray();
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    // Add pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit as string) });

    const attendance = await db.collection<Attendance>('attendance')
      .aggregate(pipeline)
      .toArray();
    
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
      .aggregate([
        {
          $match: {
            date: { $gte: startDate, $lt: endDate }
          }
        },
        {
          $lookup: {
            from: 'students',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student'
          }
        },
        {
          $unwind: {
            path: '$student',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            studentName: {
              $concat: [
                { $ifNull: ['$student.firstName', ''] },
                ' ',
                { $ifNull: ['$student.lastName', ''] }
              ]
            },
            rollNo: { 
              $ifNull: [
                '$student.rollNumber', 
                { $ifNull: ['$student.studentId', 'N/A'] }
              ]
            },
            class: { $ifNull: ['$student.class', 'N/A'] },
            section: { $ifNull: ['$student.section', ''] },
            status: 1,
            remarks: { $ifNull: ['$notes', ''] },
            date: 1,
            checkInTime: 1,
            checkOutTime: 1,
            markedBy: 1,
            createdAt: 1,
            updatedAt: 1
          }
        },
        {
          $sort: { studentName: 1 }
        }
      ])
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

  bulkUploadAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      throw createError('No CSV file uploaded', 400);
    }

    const filePath = req.file.path;
    const attendanceRecords: AttendanceCreateDto[] = [];
    const errors: string[] = [];
    const successfulUploads: any[] = [];
    const duplicateRecords: string[] = [];
    const invalidStudents: string[] = [];

    try {
      // Parse CSV file
      const csvData = await this.parseCSV(filePath);
      
      // Validate and process each row
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        try {
          const attendance = await this.validateAndMapCSVRow(row, i + 1);
          attendanceRecords.push(attendance);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Row ${i + 1}: ${errorMessage}`);
        }
      }

      const db = getDB();

      // First, collect all unique student IDs and their types
      const studentIdMap = new Map<string, ObjectId>();
      const simpleStudentIds = new Set<string>();
      const objectIdStudentIds = new Set<string>();

      attendanceRecords.forEach(record => {
        const studentIdStr = record.studentId;
        if (ObjectId.isValid(studentIdStr) && studentIdStr.length === 24) {
          objectIdStudentIds.add(studentIdStr);
          studentIdMap.set(studentIdStr, new ObjectId(studentIdStr));
        } else {
          simpleStudentIds.add(studentIdStr);
        }
      });

      // Batch lookup for simple student IDs
      if (simpleStudentIds.size > 0) {
        const studentIdArray = Array.from(simpleStudentIds);
        
        const studentsWithSimpleIds = await db.collection<Student>('students')
          .find({
            $or: [
              { studentId: { $in: studentIdArray } },        // String format (like "STU001")
              { rollNumber: { $in: studentIdArray } }        // Roll number field
            ]
          })
          .toArray();

        // Map students back to their original input IDs
        studentsWithSimpleIds.forEach(student => {
          // Check which field matched and map accordingly
          const studentIdStr = student.studentId?.toString();
          const rollNumberStr = student.rollNumber?.toString();
          
          if (studentIdStr && simpleStudentIds.has(studentIdStr)) {
            studentIdMap.set(studentIdStr, student._id!);
          } else if (rollNumberStr && simpleStudentIds.has(rollNumberStr)) {
            studentIdMap.set(rollNumberStr, student._id!);
          }
        });
      }

      // Verify all ObjectId students exist
      if (objectIdStudentIds.size > 0) {
        const objectIds = Array.from(objectIdStudentIds).map(id => new ObjectId(id));
        const studentsWithObjectIds = await db.collection<Student>('students')
          .find({ _id: { $in: objectIds } })
          .toArray();

        // Remove non-existent ObjectId students from the map
        const existingObjectIds = new Set(studentsWithObjectIds.map(s => s._id!.toString()));
        objectIdStudentIds.forEach(id => {
          if (!existingObjectIds.has(id)) {
            studentIdMap.delete(id);
          }
        });
      }

      // Check for existing attendance records (duplicate prevention)
      const duplicateChecks = await Promise.all(
        attendanceRecords.map(async (record) => {
          const studentObjectId = studentIdMap.get(record.studentId);
          if (!studentObjectId) return { record, existing: null };
          
          const existing = await db.collection<Attendance>('attendance')
            .findOne({
              studentId: studentObjectId,
              date: new Date(record.date)
            });
          return { record, existing };
        })
      );

      // Filter out invalid students and duplicates
      const validRecords = attendanceRecords.filter((record, index) => {
        const studentObjectId = studentIdMap.get(record.studentId);
        
        if (!studentObjectId) {
          invalidStudents.push(`Row ${index + 1}: Student ID ${record.studentId} not found`);
          return false;
        }

        const duplicateCheck = duplicateChecks.find(check => 
          check.record.studentId === record.studentId && 
          new Date(check.record.date).toDateString() === new Date(record.date).toDateString()
        );

        if (duplicateCheck && duplicateCheck.existing) {
          duplicateRecords.push(`Row ${index + 1}: Attendance already exists for Student ID ${record.studentId} on ${new Date(record.date).toDateString()}`);
          return false;
        }

        return true;
      });

      // Insert new attendance records
      if (validRecords.length > 0) {
        const attendanceToInsert = validRecords.map(record => {
          const studentObjectId = studentIdMap.get(record.studentId)!;
          return {
            studentId: studentObjectId,
            date: new Date(record.date),
            status: record.status,
            checkInTime: record.checkInTime ? new Date(record.checkInTime) : undefined,
            checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : undefined,
            notes: record.notes,
            markedBy: req.user!.id,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        });

        const result = await db.collection<Attendance>('attendance').insertMany(attendanceToInsert);
        
        // Get the inserted attendance records with their IDs
        const insertedRecords = await db.collection<Attendance>('attendance')
          .find({ _id: { $in: Object.values(result.insertedIds) } })
          .toArray();

        successfulUploads.push(...insertedRecords);
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        data: {
          totalRows: csvData.length,
          successfulUploads: successfulUploads.length,
          duplicates: duplicateRecords.length,
          invalidStudents: invalidStudents.length,
          errors: errors.length,
          uploadedAttendance: successfulUploads,
          duplicateRecords: duplicateRecords,
          invalidStudentsList: invalidStudents,
          validationErrors: errors
        }
      });

    } catch (error) {
      // Clean up uploaded file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw createError(`Failed to process CSV file: ${errorMessage}`, 500);
    }
  });

  private parseCSV(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  private async validateAndMapCSVRow(row: any, rowNumber: number): Promise<AttendanceCreateDto> {
    const requiredFields = [
      'studentId', 'date', 'status'
    ];

    // Check for missing required fields
    for (const field of requiredFields) {
      if (!row[field] || row[field].toString().trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    if (!validStatuses.includes(row.status.toLowerCase())) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Validate date format
    const date = new Date(row.date);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD or MM/DD/YYYY format');
    }

    // Validate check-in time if provided
    let checkInTime: Date | undefined;
    if (row.checkInTime && row.checkInTime.trim()) {
      checkInTime = new Date(`${row.date}T${row.checkInTime}`);
      if (isNaN(checkInTime.getTime())) {
        throw new Error('Invalid check-in time format. Use HH:MM format (24-hour)');
      }
    }

    // Validate check-out time if provided
    let checkOutTime: Date | undefined;
    if (row.checkOutTime && row.checkOutTime.trim()) {
      checkOutTime = new Date(`${row.date}T${row.checkOutTime}`);
      if (isNaN(checkOutTime.getTime())) {
        throw new Error('Invalid check-out time format. Use HH:MM format (24-hour)');
      }
      
      // Validate that check-out is after check-in
      if (checkInTime && checkOutTime <= checkInTime) {
        throw new Error('Check-out time must be after check-in time');
      }
    }

    // Handle both ObjectId format and simple student ID format
    let studentObjectId: ObjectId;
    const studentIdStr = row.studentId.toString().trim();
    
    // Check if it's already a valid ObjectId format
    if (ObjectId.isValid(studentIdStr) && studentIdStr.length === 24) {
      studentObjectId = new ObjectId(studentIdStr);
    } else {
      // For simple student IDs, we need to find the corresponding ObjectId in the database
      const db = getDB();
      
      // Try multiple approaches to find the student
      const student = await db.collection<Student>('students').findOne({
        $or: [
          { studentId: studentIdStr },           // Exact string match (like "STU001")
          { rollNumber: studentIdStr }           // Roll number field
        ]
      });
      
      if (!student) {
        throw new Error(`Student with ID '${studentIdStr}' not found in database (searched in studentId and rollNumber fields)`);
      }
      
      studentObjectId = student._id!;
    }

    // Get notes/remarks (support both column names)
    const notes = row.notes || row.remarks || undefined;

    // Map CSV row to AttendanceCreateDto
    const attendance: AttendanceCreateDto = {
      studentId: studentObjectId.toString(),
      date: date,
      status: row.status.toLowerCase() as 'present' | 'absent' | 'late' | 'excused',
      checkInTime: checkInTime,
      checkOutTime: checkOutTime,
      notes: notes ? notes.trim() : undefined
    };

    return attendance;
  }

  downloadCSVTemplate = asyncHandler(async (req: Request, res: Response) => {
    const csvTemplate = `studentId,date,status,checkInTime,checkOutTime,remarks
STU001,2024-08-01,present,09:00,15:30,Student arrived on time
STU002,2024-08-01,absent,,,Sick leave - informed by parent
STU003,2024-08-01,late,09:30,15:30,Transport delay - arrived 30 minutes late
STU004,2024-08-01,excused,,,Medical appointment
507f1f77bcf86cd799439011,2024-08-01,present,08:45,15:30,ObjectId format also supported`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_upload_template.csv"');
    res.send(csvTemplate);
  });
}
