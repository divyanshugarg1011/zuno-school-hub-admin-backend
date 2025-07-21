import { Request, Response } from 'express';
import { getDB } from '../config/database';
import { Fee, FeeCreateDto, FeeUpdateDto, FeeWithStudent } from '../models/Fee';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { ObjectId } from 'mongodb';
import csv from 'csv-parser';
import fs from 'fs';

export class FeeController {

  // Helper method to create aggregation pipeline for joining with students
  private getFeesWithStudentPipeline(matchStage: any = {}, skip: number = 0, limit?: number) {
    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: 'studentId',
          as: 'student'
        }
      },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          totalPaid: {
            $sum: {
              $map: {
                input: { $ifNull: ['$payments', []] },
                as: 'payment',
                in: '$$payment.amount'
              }
            }
          },
          totalDue: '$amount',
          remainingAmount: {
            $subtract: [
              '$amount',
              {
                $sum: {
                  $map: {
                    input: { $ifNull: ['$payments', []] },
                    as: 'payment',
                    in: '$$payment.amount'
                  }
                }
              }
            ]
          },
          studentName: {
            $cond: [
              { $ifNull: ['$student', false] },
              { $concat: [
                { $ifNull: ['$student.firstName', ''] },
                ' ',
                { $ifNull: ['$student.lastName', ''] }
              ] },
              null
            ]
          },
          studentRollNo: '$student.rollNumber',
          studentClass: '$student.class'
        }
      },
      {
        $project: {
          _id: 1,
          studentId: 1,
          feeType: 1,
          amount: 1,
          dueDate: 1,
          status: 1,
          description: 1,
          academicYear: 1,
          month: 1,
          term: 1,
          payments: 1,
          discounts: 1,
          createdAt: 1,
          updatedAt: 1,
          // Calculated fields
          totalDue: 1,
          totalPaid: 1,
          remainingAmount: 1,
          studentName: 1,
          studentRollNo: 1,
          studentClass: 1,
          // Student information
          student: {
            _id: '$student._id',
            studentId: '$student.studentId',
            firstName: '$student.firstName',
            lastName: '$student.lastName',
            email: '$student.email',
            phone: '$student.phone',
            class: '$student.class',
            section: '$student.section',
            rollNumber: '$student.rollNumber',
            parentInfo: '$student.parentInfo',
            isActive: '$student.isActive'
          }
        }
      },
      { $skip: skip }
    ];

    if (limit) {
      pipeline.push({ $limit: limit });
    }

    return pipeline;
  }
  
  getAllFees = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Use aggregation pipeline to get fees with student information
    const pipeline = this.getFeesWithStudentPipeline({}, skip, limit);
    const fees = await db.collection<FeeWithStudent>('fees')
      .aggregate(pipeline)
      .toArray();
      
    const total = await db.collection<Fee>('fees').countDocuments({});
    
    res.json({
      success: true,
      data: {
        fees,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  searchFees = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const { q, status, feeType, studentId, academicYear, month, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Build search query
    const searchQuery: any = {};
    
    // Status filter
    if (status) {
      searchQuery.status = status;
    }
    
    // Fee type filter
    if (feeType) {
      searchQuery.feeType = feeType;
    }
    
    // Student ID filter
    if (studentId) {
      searchQuery.studentId = new ObjectId(studentId as string);
    }
    
    // Academic year filter
    if (academicYear) {
      searchQuery.academicYear = academicYear;
    }
    
    // Month filter
    if (month) {
      searchQuery.month = month;
    }
    
    // Text search (description)
    if (q) {
      const searchRegex = new RegExp(q as string, 'i');
      searchQuery.description = searchRegex;
    }
    
    // Get fees with student information using aggregation
    const pipeline = this.getFeesWithStudentPipeline(searchQuery, skip, parseInt(limit as string));
    const fees = await db.collection<FeeWithStudent>('fees')
      .aggregate(pipeline)
      .toArray();
      
    const total = await db.collection<Fee>('fees').countDocuments(searchQuery);
    
    res.json({
      success: true,
      data: {
        fees,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        },
        query: { q, status, feeType, studentId, academicYear, month }
      }
    });
  });

  exportFees = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const { format, status, feeType, studentId, academicYear, month, q } = req.query;
    
    // Build search query
    const searchQuery: any = {};
    
    // Status filter
    if (status) {
      searchQuery.status = status;
    }
    
    // Fee type filter
    if (feeType) {
      searchQuery.feeType = feeType;
    }
    
    // Student ID filter
    if (studentId) {
      searchQuery.studentId = new ObjectId(studentId as string);
    }
    
    // Academic year filter
    if (academicYear) {
      searchQuery.academicYear = academicYear;
    }
    
    // Month filter
    if (month) {
      searchQuery.month = month;
    }
    
    // Text search (description)
    if (q) {
      const searchRegex = new RegExp(q as string, 'i');
      searchQuery.description = searchRegex;
    }
    
    // Get fees with student information using aggregation
    const pipeline = this.getFeesWithStudentPipeline(searchQuery);
    const fees = await db.collection<FeeWithStudent>('fees')
      .aggregate(pipeline)
      .toArray();
    
    if (format === 'csv') {
      // Generate CSV with student information and calculated fields
      const csvHeader = [
        'Fee ID', 'Student', 'Roll No', 'Class', 'Fee Type', 'Total Due', 
        'Paid', 'Remaining', 'Status', 'Due Date', 'Academic Year', 'Term', 
        'Description', 'Parent Contact', 'Created At'
      ].join(',');
      
      const csvRows = fees.map(fee => [
        fee._id?.toString() || '',
        fee.studentName || (fee.student ? `${fee.student.firstName} ${fee.student.lastName}` : ''),
        fee.student?.rollNumber || '',
        fee.student ? `${fee.student.class}-${fee.student.section}` : '',
        fee.feeType,
        fee.totalDue || fee.amount,
        fee.totalPaid || 0,
        fee.remainingAmount || fee.amount,
        fee.status,
        fee.dueDate ? new Date(fee.dueDate).toISOString().split('T')[0] : '',
        fee.academicYear,
        fee.term || '',
        fee.description || '',
        fee.student?.parentInfo?.contactNumber || '',
        fee.createdAt ? new Date(fee.createdAt).toISOString().split('T')[0] : ''
      ].map(field => {
        // Escape quotes and wrap in quotes if contains comma
        const stringField = String(field || '');
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      }).join(','));
      
      const csvContent = [csvHeader, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="fees_export_${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      // Default to JSON export
      res.json({
        success: true,
        data: {
          fees,
          exportedAt: new Date().toISOString(),
          totalRecords: fees.length,
          filters: { format, status, feeType, studentId, academicYear, month, q }
        }
      });
    }
  });

  getFeeById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    
    // Use aggregation to get fee with student information
    const pipeline = this.getFeesWithStudentPipeline({ _id: new ObjectId(id) });
    const feeResult = await db.collection<FeeWithStudent>('fees')
      .aggregate(pipeline)
      .toArray();
    
    if (feeResult.length === 0) {
      throw createError('Fee not found', 404);
    }
    
    const fee = feeResult[0];
    
    res.json({
      success: true,
      data: fee
    });
  });

  createFee = asyncHandler(async (req: Request, res: Response) => {
    const feeData: FeeCreateDto = req.body;
    
    const db = getDB();
    
    const newFee: Fee = {
      ...feeData,
      studentId: feeData.studentId as any,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection<Fee>('fees').insertOne(newFee);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newFee
      }
    });
  });

  updateFee = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: FeeUpdateDto = req.body;
    
    const db = getDB();
    
    const result = await db.collection<Fee>('fees').updateOne(
      { _id: id as any },
      { 
        $set: { 
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Fee not found', 404);
    }
    
    const updatedFee = await db.collection<Fee>('fees').findOne({ _id: id as any });
    
    res.json({
      success: true,
      data: updatedFee
    });
  });

  deleteFee = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    
    const result = await db.collection<Fee>('fees').deleteOne({ _id: id as any });
    
    if (result.deletedCount === 0) {
      throw createError('Fee not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Fee deleted successfully'
    });
  });

  getFeesByStudent = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    
    const db = getDB();
    
    // Use aggregation to get fees with student information
    const pipeline = this.getFeesWithStudentPipeline({ studentId: new ObjectId(studentId) });
    const fees = await db.collection<FeeWithStudent>('fees')
      .aggregate(pipeline)
      .toArray();
    
    res.json({
      success: true,
      data: fees
    });
  });

  getFeesByClass = asyncHandler(async (req: Request, res: Response) => {
    const { classId } = req.params;
    
    const db = getDB();
    
    // Get fees by joining with students and filtering by class
    const pipeline = [
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
        $match: {
          'student.class': classId
        }
      },
      {
        $project: {
          _id: 1,
          studentId: 1,
          feeType: 1,
          amount: 1,
          dueDate: 1,
          status: 1,
          description: 1,
          academicYear: 1,
          month: 1,
          payments: 1,
          discounts: 1,
          createdAt: 1,
          updatedAt: 1,
          student: {
            _id: '$student._id',
            studentId: '$student.studentId',
            firstName: '$student.firstName',
            lastName: '$student.lastName',
            email: '$student.email',
            phone: '$student.phone',
            class: '$student.class',
            section: '$student.section',
            rollNumber: '$student.rollNumber',
            parentInfo: '$student.parentInfo',
            isActive: '$student.isActive'
          }
        }
      }
    ];
    
    const fees = await db.collection<FeeWithStudent>('fees')
      .aggregate(pipeline)
      .toArray();
    
    res.json({
      success: true,
      data: fees
    });
  });

  getPendingFees = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    
    // Use aggregation to get pending fees with student information
    const pipeline = this.getFeesWithStudentPipeline({ status: 'pending' });
    const fees = await db.collection<FeeWithStudent>('fees')
      .aggregate(pipeline)
      .toArray();
    
    res.json({
      success: true,
      data: fees
    });
  });

  getOverdueFees = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const today = new Date();
    
    // Use aggregation to get overdue fees with student information
    const pipeline = this.getFeesWithStudentPipeline({ 
      dueDate: { $lt: today },
      status: 'pending'
    });
    const fees = await db.collection<FeeWithStudent>('fees')
      .aggregate(pipeline)
      .toArray();
    
    res.json({
      success: true,
      data: fees
    });
  });

  payFee = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { paymentMethod, transactionId, paidAmount } = req.body;
    
    const db = getDB();
    
    const fee = await db.collection<Fee>('fees').findOne({ _id: id as any });
    
    if (!fee) {
      throw createError('Fee not found', 404);
    }
    
    const payment = {
      amount: paidAmount,
      method: paymentMethod,
      transactionId,
      paidDate: new Date()
    };
    
    const totalPaid = (fee.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0) + paidAmount;
    const status = totalPaid >= fee.amount ? 'paid' : 'partial';
    
    const result = await db.collection<Fee>('fees').updateOne(
      { _id: id as any },
      { 
        $push: { payments: payment },
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Fee not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: { status, totalPaid }
    });
  });

  generateFeeReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, classId } = req.query;
    
    const db = getDB();
    
    const filter: any = {};
    
    if (startDate && endDate) {
      filter.dueDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }
    
    if (classId) {
      filter.classId = classId;
    }
    
    const fees = await db.collection<Fee>('fees').find(filter).toArray();
    
    const report = {
      totalFees: fees.length,
      totalAmount: fees.reduce((sum, fee) => sum + fee.amount, 0),
      paidAmount: fees.reduce((sum, fee) => {
        const paid = (fee.payments || []).reduce((paidSum: number, payment: any) => paidSum + payment.amount, 0);
        return sum + paid;
      }, 0),
      pendingAmount: 0,
      overdueFees: 0,
      statusBreakdown: {
        pending: fees.filter(f => f.status === 'pending').length,
        paid: fees.filter(f => f.status === 'paid').length,
        partial: fees.filter(f => f.status === 'partial').length,
        overdue: fees.filter(f => f.status === 'overdue').length
      }
    };
    
    report.pendingAmount = report.totalAmount - report.paidAmount;
    report.overdueFees = fees.filter(f => f.dueDate < new Date() && f.status !== 'paid').length;
    
    res.json({
      success: true,
      data: report
    });
  });

  sendFeeReminder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    const fee = await db.collection<Fee>('fees').findOne({ _id: id as any });
    
    if (!fee) {
      throw createError('Fee not found', 404);
    }
    
    // In a real application, you would send an email/SMS reminder here
    res.json({
      success: true,
      message: 'Fee reminder sent successfully'
    });
  });

  applyDiscount = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { discountType, discountValue, reason } = req.body;
    
    const db = getDB();
    
    const discount = {
      type: discountType, // 'percentage' or 'fixed'
      value: discountValue,
      reason,
      appliedDate: new Date()
    };
    
    const result = await db.collection<Fee>('fees').updateOne(
      { _id: id as any },
      { 
        $push: { discounts: discount },
        $set: { updatedAt: new Date() }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Fee not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Discount applied successfully'
    });
  });

  getFeeStatistics = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    
    const stats = await db.collection<Fee>('fees').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]).toArray();
    
    res.json({
      success: true,
      data: stats
    });
  });

  bulkUploadFees = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw createError('No CSV file uploaded', 400);
    }

    const filePath = req.file.path;
    const fees: FeeCreateDto[] = [];
    const errors: string[] = [];
    const successfulUploads: any[] = [];
    const duplicateFees: string[] = [];

    try {
      // Parse CSV file
      const csvData = await this.parseCSV(filePath);
      
      // Validate and process each row
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        try {
          const fee = await this.validateAndMapCSVRow(row, i + 1);
          fees.push(fee);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Row ${i + 1}: ${errorMessage}`);
        }
      }

      const db = getDB();

      // Check for existing fees (prevent duplicates based on studentId, feeType, academicYear, month)
      const existingFees = await db.collection<Fee>('fees')
        .find({
          $or: fees.map(fee => {
            const query: any = {
              studentId: new ObjectId(fee.studentId),
              feeType: fee.feeType,
              academicYear: fee.academicYear
            };
            
            if (fee.month) {
              query.month = fee.month;
            } else {
              query.month = { $exists: false };
            }
            
            return query;
          })
        })
        .toArray();

      const existingFeeKeys = new Set(
        existingFees.map(fee => 
          `${fee.studentId}-${fee.feeType}-${fee.academicYear}-${fee.month || 'no-month'}`
        )
      );

      // Filter out duplicates
      const newFees = fees.filter(fee => {
        const feeKey = `${fee.studentId}-${fee.feeType}-${fee.academicYear}-${fee.month || 'no-month'}`;
        if (existingFeeKeys.has(feeKey)) {
          duplicateFees.push(`${fee.feeType} for student ${fee.studentId} in ${fee.academicYear}${fee.month ? ` (${fee.month})` : ''}`);
          return false;
        }
        return true;
      });

      // Insert new fees
      if (newFees.length > 0) {
        const feesToInsert = newFees.map(fee => ({
          ...fee,
          studentId: new ObjectId(fee.studentId),
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        const result = await db.collection<Fee>('fees').insertMany(feesToInsert);
        
        // Get the inserted fees with their IDs
        const insertedFees = await db.collection<Fee>('fees')
          .find({ _id: { $in: Object.values(result.insertedIds) } })
          .toArray();

        successfulUploads.push(...insertedFees);
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        data: {
          totalRows: csvData.length,
          successfulUploads: successfulUploads.length,
          duplicates: duplicateFees.length,
          errors: errors.length,
          uploadedFees: successfulUploads,
          duplicateFees: duplicateFees,
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

  private async validateAndMapCSVRow(row: any, rowNumber: number): Promise<FeeCreateDto> {
    const requiredFields = [
      'studentId', 'feeType', 'amount', 'dueDate', 'academicYear'
    ];

    // Check for missing required fields
    for (const field of requiredFields) {
      if (!row[field] || row[field].toString().trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate fee type
    const validFeeTypes = ['tuition', 'transport', 'library', 'sports', 'examination', 'other'];
    const feeType = row.feeType.toLowerCase().trim();
    if (!validFeeTypes.includes(feeType)) {
      throw new Error(`Invalid fee type. Must be one of: ${validFeeTypes.join(', ')}`);
    }

    // Validate amount (should be a positive number)
    const amount = parseFloat(row.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount value. Must be a positive number');
    }

    // Validate due date
    const dueDate = new Date(row.dueDate);
    if (isNaN(dueDate.getTime())) {
      throw new Error('Invalid due date format. Use YYYY-MM-DD format');
    }

    // Validate studentId (should be a valid ObjectId)
    let studentObjectId: ObjectId;
    try {
      studentObjectId = new ObjectId(row.studentId);
    } catch (error) {
      throw new Error('Invalid student ID format. Must be a valid MongoDB ObjectId');
    }

    // Verify student exists in database
    const db = getDB();
    const student = await db.collection('students').findOne({ _id: studentObjectId });
    if (!student) {
      throw new Error(`Student with ID ${row.studentId} not found`);
    }

    // Validate academic year format (e.g., "2023-2024")
    const academicYearPattern = /^\d{4}-\d{4}$/;
    if (!academicYearPattern.test(row.academicYear.trim())) {
      throw new Error('Invalid academic year format. Use YYYY-YYYY format (e.g., 2023-2024)');
    }

    // Map CSV row to FeeCreateDto
    const fee: FeeCreateDto = {
      studentId: row.studentId.trim(),
      feeType: feeType as 'tuition' | 'transport' | 'library' | 'sports' | 'examination' | 'other',
      amount: amount,
      dueDate: dueDate,
      academicYear: row.academicYear.trim()
    };

    // Add optional fields if present
    if (row.description && row.description.trim()) {
      fee.description = row.description.trim();
    }

    if (row.month && row.month.trim()) {
      // Validate month format
      const validMonths = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const month = row.month.toLowerCase().trim();
      if (!validMonths.includes(month)) {
        throw new Error(`Invalid month. Must be one of: ${validMonths.join(', ')}`);
      }
      fee.month = month;
    }

    return fee;
  }

  downloadCSVTemplate = asyncHandler(async (req: Request, res: Response) => {
    const csvTemplate = `studentId,feeType,amount,dueDate,academicYear,month,description
507f1f77bcf86cd799439011,tuition,5000,2024-01-15,2023-2024,january,Monthly tuition fee
507f1f77bcf86cd799439012,transport,1500,2024-01-15,2023-2024,january,Monthly transport fee
507f1f77bcf86cd799439013,library,500,2024-01-15,2023-2024,,Annual library fee
507f1f77bcf86cd799439014,sports,2000,2024-01-15,2023-2024,,Annual sports fee`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="fee_upload_template.csv"');
    res.send(csvTemplate);
  });
}

export default FeeController;
