import { ObjectId } from 'mongodb';

export interface Homework {
  _id?: ObjectId;
  title: string;
  description: string;
  subject: string;
  class: string;
  section: string;
  assignedBy: ObjectId;
  assignedDate: Date;
  dueDate: Date;
  totalMarks: number;
  attachments?: string[];
  instructions?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HomeworkSubmission {
  _id?: ObjectId;
  homeworkId: ObjectId;
  studentId: ObjectId;
  submissionDate: Date;
  attachments?: string[];
  notes?: string;
  marksObtained?: number;
  feedback?: string;
  status: 'submitted' | 'late' | 'pending' | 'graded';
  gradedBy?: ObjectId;
  gradedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface HomeworkCreateDto {
  title: string;
  description: string;
  subject: string;
  class: string;
  section: string;
  dueDate: Date;
  totalMarks: number;
  attachments?: string[];
  instructions?: string;
}

export interface HomeworkUpdateDto {
  title?: string;
  description?: string;
  subject?: string;
  class?: string;
  section?: string;
  dueDate?: Date;
  totalMarks?: number;
  attachments?: string[];
  instructions?: string;
  isActive?: boolean;
}

export interface HomeworkSubmissionCreateDto {
  homeworkId: string;
  attachments?: string[];
  notes?: string;
}

export interface HomeworkSubmissionGradeDto {
  marksObtained: number;
  feedback?: string;
}
