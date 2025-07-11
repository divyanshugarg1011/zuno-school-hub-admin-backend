import { ObjectId } from 'mongodb';

export interface Student {
  _id?: ObjectId;
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  parentInfo: {
    fatherName: string;
    motherName: string;
    guardianName?: string;
    contactNumber: string;
    email?: string;
  };
  class: string;
  section: string;
  rollNumber: string;
  admissionDate: Date;
  isActive: boolean;
  profileImage?: string;
  bloodGroup?: string;
  medicalConditions?: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentCreateDto {
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  parentInfo: {
    fatherName: string;
    motherName: string;
    guardianName?: string;
    contactNumber: string;
    email?: string;
  };
  class: string;
  section: string;
  rollNumber: string;
  admissionDate: Date;
  profileImage?: string;
  bloodGroup?: string;
  medicalConditions?: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export interface StudentUpdateDto {
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
  parentInfo?: {
    fatherName: string;
    motherName: string;
    guardianName?: string;
    contactNumber: string;
    email?: string;
  };
  class?: string;
  section?: string;
  rollNumber?: string;
  isActive?: boolean;
  profileImage?: string;
  bloodGroup?: string;
  medicalConditions?: string[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
}
