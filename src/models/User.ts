import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'teacher' | 'staff';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserLoginDto {
  email: string;
  password: string;
}

export interface UserCreateDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'teacher' | 'staff';
}

export interface UserUpdateDto {
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'teacher' | 'staff';
  isActive?: boolean;
}
