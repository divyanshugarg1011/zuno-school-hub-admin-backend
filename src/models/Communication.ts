import { ObjectId } from 'mongodb';

export interface Communication {
  _id?: ObjectId;
  type: 'announcement' | 'notice' | 'event' | 'reminder' | 'urgent';
  title: string;
  content: string;
  sender: ObjectId;
  recipients: {
    type: 'all' | 'students' | 'teachers' | 'parents' | 'specific';
    targetIds?: ObjectId[];
    classes?: string[];
    sections?: string[];
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: string[];
  scheduledDate?: Date;
  expiryDate?: Date;
  isActive: boolean;
  readBy: {
    userId: ObjectId;
    readAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationCreateDto {
  type: 'announcement' | 'notice' | 'event' | 'reminder' | 'urgent';
  title: string;
  content: string;
  recipients: {
    type: 'all' | 'students' | 'teachers' | 'parents' | 'specific';
    targetIds?: string[];
    classes?: string[];
    sections?: string[];
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: string[];
  scheduledDate?: Date;
  expiryDate?: Date;
}

export interface CommunicationUpdateDto {
  type?: 'announcement' | 'notice' | 'event' | 'reminder' | 'urgent';
  title?: string;
  content?: string;
  recipients?: {
    type?: 'all' | 'students' | 'teachers' | 'parents' | 'specific';
    targetIds?: string[];
    classes?: string[];
    sections?: string[];
  };
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: string[];
  scheduledDate?: Date;
  expiryDate?: Date;
  isActive?: boolean;
}
