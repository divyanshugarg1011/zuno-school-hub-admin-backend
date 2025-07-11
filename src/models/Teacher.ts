import { ObjectId } from 'mongodb';

export interface Teacher {
  _id?: ObjectId;
  teacherId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  qualifications: string[];
  subjects: string[];
  experience: number;
  joiningDate: Date;
  salary: number;
  isActive: boolean;
  profileImage?: string;
  bloodGroup?: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  bankDetails?: {
    accountNumber: string;
    bankName: string;
    ifscCode: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherCreateDto {
  teacherId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  qualifications: string[];
  subjects: string[];
  experience: number;
  joiningDate: Date;
  salary: number;
  profileImage?: string;
  bloodGroup?: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  bankDetails?: {
    accountNumber: string;
    bankName: string;
    ifscCode: string;
  };
}

export interface TeacherUpdateDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  qualifications?: string[];
  subjects?: string[];
  experience?: number;
  salary?: number;
  isActive?: boolean;
  profileImage?: string;
  bloodGroup?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  bankDetails?: {
    accountNumber: string;
    bankName: string;
    ifscCode: string;
  };
}
