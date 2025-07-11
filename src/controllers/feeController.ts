import { Request, Response } from 'express';
import { getDB } from '../config/database';
import { Fee, FeeCreateDto, FeeUpdateDto } from '../models/Fee';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

export class FeeController {
  
  getAllFees = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const fees = await db.collection<Fee>('fees')
      .find({})
      .skip(skip)
      .limit(limit)
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

  getFeeById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    const fee = await db.collection<Fee>('fees').findOne({ _id: id as any });
    
    if (!fee) {
      throw createError('Fee not found', 404);
    }
    
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
    const fees = await db.collection<Fee>('fees')
      .find({ studentId: studentId as any })
      .toArray();
    
    res.json({
      success: true,
      data: fees
    });
  });

  getFeesByClass = asyncHandler(async (req: Request, res: Response) => {
    const { classId } = req.params;
    
    const db = getDB();
    const fees = await db.collection<Fee>('fees')
      .find({ classId })
      .toArray();
    
    res.json({
      success: true,
      data: fees
    });
  });

  getPendingFees = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const fees = await db.collection<Fee>('fees')
      .find({ status: 'pending' })
      .toArray();
    
    res.json({
      success: true,
      data: fees
    });
  });

  getOverdueFees = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const today = new Date();
    
    const fees = await db.collection<Fee>('fees')
      .find({ 
        dueDate: { $lt: today },
        status: 'pending'
      })
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
}

export default FeeController;
