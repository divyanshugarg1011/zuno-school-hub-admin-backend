import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    next();
  };
};

// Common validation schemas
export const objectIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const teacherSearchSchema = Joi.object({
  q: Joi.string().optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  subject: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

export const teacherExportSchema = Joi.object({
  format: Joi.string().valid('csv', 'json').default('json'),
  status: Joi.string().valid('active', 'inactive').optional(),
  subject: Joi.string().optional(),
  q: Joi.string().optional()
});

export const studentSearchSchema = Joi.object({
  q: Joi.string().optional(),
  class: Joi.string().optional(),
  section: Joi.string().optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

export const studentExportSchema = Joi.object({
  format: Joi.string().valid('csv', 'json').default('json'),
  class: Joi.string().optional(),
  section: Joi.string().optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  q: Joi.string().optional()
});

export const userCreateSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  role: Joi.string().valid('admin', 'teacher', 'staff').required()
});

export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const studentCreateSchema = Joi.object({
  studentId: Joi.string().required(),
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
  dateOfBirth: Joi.date().required(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    country: Joi.string().required()
  }).required(),
  parentInfo: Joi.object({
    fatherName: Joi.string().required(),
    motherName: Joi.string().required(),
    guardianName: Joi.string().optional(),
    contactNumber: Joi.string().required(),
    email: Joi.string().email().optional()
  }).required(),
  class: Joi.string().required(),
  section: Joi.string().required(),
  rollNumber: Joi.string().required(),
  admissionDate: Joi.date().required(),
  profileImage: Joi.string().optional(),
  bloodGroup: Joi.string().optional(),
  medicalConditions: Joi.array().items(Joi.string()).optional(),
  emergencyContact: Joi.object({
    name: Joi.string().required(),
    relationship: Joi.string().required(),
    phone: Joi.string().required()
  }).required()
});

export const teacherCreateSchema = Joi.object({
  teacherId: Joi.string().required(),
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  dateOfBirth: Joi.date().required(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    country: Joi.string().required()
  }).required(),
  qualifications: Joi.array().items(Joi.string()).required(),
  subjects: Joi.array().items(Joi.string()).required(),
  experience: Joi.number().integer().min(0).required(),
  joiningDate: Joi.date().required(),
  salary: Joi.number().positive().required(),
  profileImage: Joi.string().optional(),
  bloodGroup: Joi.string().optional(),
  emergencyContact: Joi.object({
    name: Joi.string().required(),
    relationship: Joi.string().required(),
    phone: Joi.string().required()
  }).required(),
  bankDetails: Joi.object({
    accountNumber: Joi.string().required(),
    bankName: Joi.string().required(),
    ifscCode: Joi.string().required()
  }).optional()
});
