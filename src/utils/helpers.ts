import { ObjectId } from 'mongodb';

export const isValidObjectId = (id: string): boolean => {
  return ObjectId.isValid(id);
};

export const generateRandomString = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const calculateAge = (dateOfBirth: Date): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

export const generateStudentId = (): string => {
  const year = new Date().getFullYear().toString().slice(-2);
  const randomNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ST${year}${randomNumber}`;
};

export const generateTeacherId = (): string => {
  const year = new Date().getFullYear().toString().slice(-2);
  const randomNumber = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TC${year}${randomNumber}`;
};

export const generateReceiptNumber = (): string => {
  const year = new Date().getFullYear().toString();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const randomNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP${year}${month}${randomNumber}`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

export const getAcademicYear = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  if (month >= 4) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
};

export const getMonthName = (monthNumber: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || '';
};

export const getDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

export const getSchoolDays = (startDate: Date, endDate: Date): Date[] => {
  const allDates = getDateRange(startDate, endDate);
  return allDates.filter(date => !isWeekend(date));
};
