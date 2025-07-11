import { ObjectId } from 'mongodb';

export interface Fee {
  _id?: ObjectId;
  studentId: ObjectId;
  feeType: 'tuition' | 'transport' | 'library' | 'sports' | 'examination' | 'other';
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  description?: string;
  academicYear: string;
  month?: string;
  payments?: Array<{
    amount: number;
    method: 'cash' | 'card' | 'online' | 'check' | 'bank_transfer';
    transactionId?: string;
    paidDate: Date;
  }>;
  discounts?: Array<{
    type: 'percentage' | 'fixed';
    value: number;
    reason: string;
    appliedDate: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeePayment {
  _id?: ObjectId;
  feeId: ObjectId;
  studentId: ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'cash' | 'card' | 'online' | 'check' | 'bank_transfer';
  transactionId?: string;
  receiptNumber: string;
  notes?: string;
  processedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeeCreateDto {
  studentId: string;
  feeType: 'tuition' | 'transport' | 'library' | 'sports' | 'examination' | 'other';
  amount: number;
  dueDate: Date;
  description?: string;
  academicYear: string;
  month?: string;
}

export interface FeeUpdateDto {
  feeType?: 'tuition' | 'transport' | 'library' | 'sports' | 'examination' | 'other';
  amount?: number;
  dueDate?: Date;
  status?: 'pending' | 'paid' | 'overdue' | 'partial';
  description?: string;
  academicYear?: string;
  month?: string;
}

export interface FeePaymentCreateDto {
  feeId: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'online' | 'check' | 'bank_transfer';
  transactionId?: string;
  receiptNumber: string;
  notes?: string;
}

export interface FeeReport {
  studentId: ObjectId;
  studentName: string;
  totalFees: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
}
