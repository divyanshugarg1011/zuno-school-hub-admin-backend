import { ObjectId } from 'mongodb';

export interface Attendance {
  _id?: ObjectId;
  studentId: ObjectId;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  checkInTime?: Date;
  checkOutTime?: Date;
  notes?: string;
  markedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceCreateDto {
  studentId: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  checkInTime?: Date;
  checkOutTime?: Date;
  notes?: string;
}

export interface AttendanceUpdateDto {
  status?: 'present' | 'absent' | 'late' | 'excused';
  checkInTime?: Date;
  checkOutTime?: Date;
  notes?: string;
}

export interface AttendanceReport {
  studentId: ObjectId;
  studentName: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  attendancePercentage: number;
}
