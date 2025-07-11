import { Request, Response } from 'express';
import { getDB } from '../config/database';
import { Communication, CommunicationCreateDto, CommunicationUpdateDto } from '../models/Communication';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

export class CommunicationController {
  
  getAllCommunications = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const communications = await db.collection<Communication>('communications')
      .find({})
      .skip(skip)
      .limit(limit)
      .toArray();
      
    const total = await db.collection<Communication>('communications').countDocuments({});
    
    res.json({
      success: true,
      data: {
        communications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  getCommunicationById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    const communication = await db.collection<Communication>('communications').findOne({ _id: id as any });
    
    if (!communication) {
      throw createError('Communication not found', 404);
    }
    
    res.json({
      success: true,
      data: communication
    });
  });

  createCommunication = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const communicationData: CommunicationCreateDto = req.body;
    
    const db = getDB();
    
    const newCommunication: Communication = {
      ...communicationData,
      sender: req.user!.id,
      recipients: {
        ...communicationData.recipients,
        targetIds: communicationData.recipients.targetIds?.map(id => id as any)
      },
      isActive: true,
      readBy: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection<Communication>('communications').insertOne(newCommunication);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newCommunication
      }
    });
  });

  updateCommunication = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: any = req.body;
    
    const db = getDB();
    
    const result = await db.collection<Communication>('communications').updateOne(
      { _id: id as any },
      { 
        $set: { 
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Communication not found', 404);
    }
    
    const updatedCommunication = await db.collection<Communication>('communications').findOne({ _id: id as any });
    
    res.json({
      success: true,
      data: updatedCommunication
    });
  });

  deleteCommunication = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    
    const result = await db.collection<Communication>('communications').deleteOne({ _id: id as any });
    
    if (result.deletedCount === 0) {
      throw createError('Communication not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Communication deleted successfully'
    });
  });

  getCommunicationsByType = asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params;
    
    const db = getDB();
    const communications = await db.collection<Communication>('communications')
      .find({ type: type as any })
      .toArray();
    
    res.json({
      success: true,
      data: communications
    });
  });

  getCommunicationsByRecipient = asyncHandler(async (req: Request, res: Response) => {
    const { recipientId } = req.params;
    
    const db = getDB();
    const communications = await db.collection<Communication>('communications')
      .find({ 
        $or: [
          { 'recipients.userId': recipientId },
          { 'recipients.all': true }
        ]
      })
      .toArray();
    
    res.json({
      success: true,
      data: communications
    });
  });

  getCommunicationsBySender = asyncHandler(async (req: Request, res: Response) => {
    const { senderId } = req.params;
    
    const db = getDB();
    const communications = await db.collection<Communication>('communications')
      .find({ senderId })
      .toArray();
    
    res.json({
      success: true,
      data: communications
    });
  });

  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;
    
    const db = getDB();
    
    const result = await db.collection<Communication>('communications').updateOne(
      { 
        _id: id as any,
        'recipients.userId': userId
      },
      { 
        $set: { 
          'recipients.$.readAt': new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Communication not found or user not a recipient', 404);
    }
    
    res.json({
      success: true,
      message: 'Communication marked as read'
    });
  });

  sendBulkCommunication = asyncHandler(async (req: Request, res: Response) => {
    const { 
      type, 
      title, 
      content, 
      senderId, 
      recipientType, 
      recipientIds,
      priority,
      attachments 
    } = req.body;
    
    const db = getDB();
    
    let recipientConfig: any;
    
    if (recipientType === 'all') {
      recipientConfig = { type: 'all' };
    } else if (recipientType === 'class') {
      // Get all students in the specified classes
      const students = await db.collection('students')
        .find({ classId: { $in: recipientIds } })
        .toArray();
      recipientConfig = { 
        type: 'specific',
        targetIds: students.map(student => student._id) 
      };
    } else if (recipientType === 'individual') {
      recipientConfig = { 
        type: 'specific',
        targetIds: recipientIds.map((id: string) => id as any) 
      };
    }
    
    const newCommunication: Communication = {
      type,
      title,
      content,
      sender: senderId as any,
      recipients: recipientConfig,
      priority: priority || 'medium',
      attachments: attachments || [],
      isActive: true,
      readBy: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection<Communication>('communications').insertOne(newCommunication);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newCommunication
      }
    });
  });

  getUnreadCommunications = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    
    const db = getDB();
    const communications = await db.collection<Communication>('communications')
      .find({ 
        $or: [
          { 
            'recipients.userId': userId,
            'recipients.readAt': { $exists: false }
          },
          { 
            'recipients.all': true
          }
        ]
      })
      .toArray();
    
    res.json({
      success: true,
      data: communications
    });
  });

  getCommunicationStats = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    
    const stats = await db.collection<Communication>('communications').aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unreadCount: {
            $sum: {
              $size: {
                $filter: {
                  input: '$recipients',
                  cond: { $not: { $ifNull: ['$$this.readAt', false] } }
                }
              }
            }
          }
        }
      }
    ]).toArray();
    
    res.json({
      success: true,
      data: stats
    });
  });

  scheduleMessage = asyncHandler(async (req: Request, res: Response) => {
    const { 
      type, 
      title, 
      content, 
      senderId, 
      recipients,
      scheduledFor,
      priority,
      attachments 
    } = req.body;
    
    const db = getDB();
    
    const newCommunication: Communication = {
      type,
      title,
      content,
      sender: senderId as any,
      recipients: {
        ...recipients,
        targetIds: recipients.targetIds?.map((id: string) => id as any)
      },
      priority: priority || 'medium',
      attachments: attachments || [],
      scheduledDate: new Date(scheduledFor),
      isActive: true,
      readBy: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection<Communication>('communications').insertOne(newCommunication);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newCommunication
      }
    });
  });

  getScheduledMessages = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const messages = await db.collection<Communication>('communications')
      .find({ 
        scheduledFor: { $exists: true, $gt: new Date() }
      })
      .toArray();
    
    res.json({
      success: true,
      data: messages
    });
  });

  uploadAttachment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!req.file) {
      throw createError('No file uploaded', 400);
    }
    
    const db = getDB();
    const fileUrl = `/uploads/communications/${req.file.filename}`;
    
    const result = await db.collection<Communication>('communications').updateOne(
      { _id: id as any },
      { 
        $push: { attachments: fileUrl },
        $set: { updatedAt: new Date() }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Communication not found', 404);
    }
    
    res.json({
      success: true,
      data: { fileUrl }
    });
  });
}

export default CommunicationController;
