import { Request, Response } from 'express';
import { getDB } from '../config/database';
import { Teacher, TeacherCreateDto, TeacherUpdateDto } from '../models/Teacher';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { ObjectId } from 'mongodb';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';

export class TeacherController {
  
  private convertToObjectId(id: string): ObjectId {
    try {
      return new ObjectId(id);
    } catch (error) {
      throw createError('Invalid teacher ID format', 400);
    }
  }
  
  getAllTeachers = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const teachers = await db.collection<Teacher>('teachers')
      .find()
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection<Teacher>('teachers').countDocuments();

    res.json({
      success: true,
      data: {
        teachers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  searchTeachers = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const { q, status, subject, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Build search query
    const searchQuery: any = {};
    
    // Status filter
    if (status) {
      searchQuery.isActive = status === 'active';
    } else {
      searchQuery.isActive = true; // Default to active teachers
    }
    
    // Subject filter
    if (subject) {
      searchQuery.subjects = { $in: [subject] };
    }
    
    // Text search
    if (q) {
      const searchRegex = new RegExp(q as string, 'i');
      searchQuery.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { teacherId: searchRegex },
        { phone: searchRegex },
        { subjects: { $in: [searchRegex] } },
        { qualifications: { $in: [searchRegex] } }
      ];
    }
    
    const teachers = await db.collection<Teacher>('teachers')
      .find(searchQuery)
      .skip(skip)
      .limit(parseInt(limit as string))
      .toArray();
      
    const total = await db.collection<Teacher>('teachers').countDocuments(searchQuery);
    
    res.json({
      success: true,
      data: {
        teachers,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        },
        query: { q, status, subject }
      }
    });
  });

  exportTeachers = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const { format, status, subject, q } = req.query;
    
    // Build search query
    const searchQuery: any = {};
    
    // Status filter
    if (status) {
      searchQuery.isActive = status === 'active';
    } else {
      searchQuery.isActive = true; // Default to active teachers
    }
    
    // Subject filter
    if (subject) {
      searchQuery.subjects = { $in: [subject] };
    }
    
    // Text search
    if (q) {
      const searchRegex = new RegExp(q as string, 'i');
      searchQuery.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { teacherId: searchRegex },
        { phone: searchRegex },
        { subjects: { $in: [searchRegex] } },
        { qualifications: { $in: [searchRegex] } }
      ];
    }
    
    const teachers = await db.collection<Teacher>('teachers')
      .find(searchQuery)
      .toArray();
    
    if (format === 'csv') {
      // Generate CSV
      const csvHeader = [
        'Teacher ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Date of Birth',
        'Gender', 'Street', 'City', 'State', 'Zip Code', 'Country', 'Qualifications',
        'Subjects', 'Experience', 'Joining Date', 'Salary', 'Status', 'Blood Group',
        'Emergency Contact Name', 'Emergency Contact Relationship', 'Emergency Contact Phone',
        'Bank Account Number', 'Bank Name', 'IFSC Code'
      ].join(',');
      
      const csvRows = teachers.map(teacher => [
        teacher.teacherId,
        teacher.firstName,
        teacher.lastName,
        teacher.email,
        teacher.phone,
        teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toISOString().split('T')[0] : '',
        teacher.gender,
        teacher.address?.street || '',
        teacher.address?.city || '',
        teacher.address?.state || '',
        teacher.address?.zipCode || '',
        teacher.address?.country || '',
        teacher.qualifications?.join('; ') || '',
        teacher.subjects?.join('; ') || '',
        teacher.experience,
        teacher.joiningDate ? new Date(teacher.joiningDate).toISOString().split('T')[0] : '',
        teacher.salary,
        teacher.isActive ? 'Active' : 'Inactive',
        teacher.bloodGroup || '',
        teacher.emergencyContact?.name || '',
        teacher.emergencyContact?.relationship || '',
        teacher.emergencyContact?.phone || '',
        teacher.bankDetails?.accountNumber || '',
        teacher.bankDetails?.bankName || '',
        teacher.bankDetails?.ifscCode || ''
      ].map(field => {
        // Escape quotes and wrap in quotes if contains comma
        const stringField = String(field || '');
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      }).join(','));
      
      const csvContent = [csvHeader, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="teachers_export_${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      // Default to JSON export
      res.json({
        success: true,
        data: {
          teachers,
          exportedAt: new Date().toISOString(),
          totalRecords: teachers.length,
          filters: { format, status, subject, q }
        }
      });
    }
  });

  getTeacherById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    const objectId = this.convertToObjectId(id);
    const teacher = await db.collection<Teacher>('teachers').findOne({ _id: objectId });
    
    if (!teacher) {
      throw createError('Teacher not found', 404);
    }
    
    res.json({
      success: true,
      data: teacher
    });
  });

  createTeacher = asyncHandler(async (req: Request, res: Response) => {
    const teacherData: TeacherCreateDto = req.body;
    
    const db = getDB();
    
    // Check if teacher already exists
    const existingTeacher = await db.collection<Teacher>('teachers').findOne({ email: teacherData.email });
    if (existingTeacher) {
      throw createError('Teacher already exists with this email', 400);
    }
    
    const newTeacher: Teacher = {
      ...teacherData,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection<Teacher>('teachers').insertOne(newTeacher);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newTeacher
      }
    });
  });

  updateTeacher = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: TeacherUpdateDto = req.body;
    
    const db = getDB();
    
    // Convert string ID to ObjectId
    const objectId = this.convertToObjectId(id);
    
    const result = await db.collection<Teacher>('teachers').updateOne(
      { _id: objectId },
      { 
        $set: { 
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Teacher not found', 404);
    }
    
    const updatedTeacher = await db.collection<Teacher>('teachers').findOne({ _id: objectId });
    
    res.json({
      success: true,
      data: updatedTeacher
    });
  });

  deleteTeacher = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    const objectId = this.convertToObjectId(id);
    
    const result = await db.collection<Teacher>('teachers').updateOne(
      { _id: objectId },
      { 
        $set: { 
          isActive: false,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Teacher not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  });

  getTeachersBySubject = asyncHandler(async (req: Request, res: Response) => {
    const { subject } = req.params;
    
    const db = getDB();
    const teachers = await db.collection<Teacher>('teachers')
      .find({ 
        subjects: { $in: [subject] },
        isActive: true 
      })
      .toArray();
    
    res.json({
      success: true,
      data: teachers
    });
  });

  getTeachersByClass = asyncHandler(async (req: Request, res: Response) => {
    const { classId } = req.params;
    
    const db = getDB();
    const teachers = await db.collection<Teacher>('teachers')
      .find({ 
        classes: { $in: [classId] },
        isActive: true 
      })
      .toArray();
    
    res.json({
      success: true,
      data: teachers
    });
  });

  uploadTeacherPhoto = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!req.file) {
      throw createError('No file uploaded', 400);
    }
    
    const db = getDB();
    const objectId = this.convertToObjectId(id);
    const photoUrl = `/uploads/teachers/${req.file.filename}`;
    
    const result = await db.collection<Teacher>('teachers').updateOne(
      { _id: objectId },
      { 
        $set: { 
          profileImage: photoUrl,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Teacher not found', 404);
    }
    
    res.json({
      success: true,
      data: { photoUrl }
    });
  });

  assignClassToTeacher = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { classId } = req.body;
    
    const db = getDB();
    const objectId = this.convertToObjectId(id);
    
    const result = await db.collection<Teacher>('teachers').updateOne(
      { _id: objectId },
      { 
        $addToSet: { classes: classId },
        $set: { updatedAt: new Date() }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Teacher not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Class assigned to teacher successfully'
    });
  });

  removeClassFromTeacher = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { classId } = req.body;
    
    const db = getDB();
    const objectId = this.convertToObjectId(id);
    
    const result = await db.collection<Teacher>('teachers').updateOne(
      { _id: objectId },
      { 
        $pull: { classes: classId },
        $set: { updatedAt: new Date() }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Teacher not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Class removed from teacher successfully'
    });
  });

  bulkUploadTeachers = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw createError('No CSV file uploaded', 400);
    }

    const filePath = req.file.path;
    const teachers: TeacherCreateDto[] = [];
    const errors: string[] = [];
    const successfulUploads: any[] = [];
    const duplicateEmails: string[] = [];

    try {
      // Parse CSV file
      const csvData = await this.parseCSV(filePath);
      
      // Validate and process each row
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        try {
          const teacher = await this.validateAndMapCSVRow(row, i + 1);
          teachers.push(teacher);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Row ${i + 1}: ${errorMessage}`);
        }
      }

      // Check for existing teachers
      const db = getDB();
      const existingTeachers = await db.collection<Teacher>('teachers')
        .find({ email: { $in: teachers.map(t => t.email) } })
        .toArray();

      const existingEmails = new Set(existingTeachers.map(t => t.email));

      // Filter out duplicates
      const newTeachers = teachers.filter(teacher => {
        if (existingEmails.has(teacher.email)) {
          duplicateEmails.push(teacher.email);
          return false;
        }
        return true;
      });

      // Insert new teachers
      if (newTeachers.length > 0) {
        const teachersToInsert = newTeachers.map(teacher => ({
          ...teacher,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        const result = await db.collection<Teacher>('teachers').insertMany(teachersToInsert);
        
        // Get the inserted teachers with their IDs
        const insertedTeachers = await db.collection<Teacher>('teachers')
          .find({ _id: { $in: Object.values(result.insertedIds) } })
          .toArray();

        successfulUploads.push(...insertedTeachers);
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        data: {
          totalRows: csvData.length,
          successfulUploads: successfulUploads.length,
          duplicates: duplicateEmails.length,
          errors: errors.length,
          uploadedTeachers: successfulUploads,
          duplicateEmails: duplicateEmails,
          validationErrors: errors
        }
      });

    } catch (error) {
      // Clean up uploaded file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw createError(`Failed to process CSV file: ${errorMessage}`, 500);
    }
  });

  private parseCSV(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  private async validateAndMapCSVRow(row: any, rowNumber: number): Promise<TeacherCreateDto> {
    const requiredFields = [
      'teacherId', 'firstName', 'lastName', 'email', 'phone', 'dateOfBirth',
      'gender', 'street', 'city', 'state', 'zipCode', 'country', 'qualifications',
      'subjects', 'experience', 'joiningDate', 'salary', 'emergencyContactName',
      'emergencyContactRelationship', 'emergencyContactPhone'
    ];

    // Check for missing required fields
    for (const field of requiredFields) {
      if (!row[field] || row[field].trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone number (basic validation)
    const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(row.phone)) {
      throw new Error('Invalid phone number format');
    }

    // Validate gender
    const validGenders = ['male', 'female', 'other'];
    if (!validGenders.includes(row.gender.toLowerCase())) {
      throw new Error('Invalid gender. Must be male, female, or other');
    }

    // Validate dates
    const dateOfBirth = new Date(row.dateOfBirth);
    const joiningDate = new Date(row.joiningDate);
    
    if (isNaN(dateOfBirth.getTime())) {
      throw new Error('Invalid date of birth format');
    }
    
    if (isNaN(joiningDate.getTime())) {
      throw new Error('Invalid joining date format');
    }

    // Validate experience (should be a number)
    const experience = parseInt(row.experience);
    if (isNaN(experience) || experience < 0) {
      throw new Error('Invalid experience value');
    }

    // Validate salary (should be a positive number)
    const salary = parseFloat(row.salary);
    if (isNaN(salary) || salary <= 0) {
      throw new Error('Invalid salary value');
    }

    // Parse arrays (qualifications and subjects)
    const qualifications = row.qualifications.split(',').map((q: string) => q.trim()).filter((q: string) => q);
    const subjects = row.subjects.split(',').map((s: string) => s.trim()).filter((s: string) => s);

    if (qualifications.length === 0) {
      throw new Error('At least one qualification is required');
    }

    if (subjects.length === 0) {
      throw new Error('At least one subject is required');
    }

    // Map CSV row to TeacherCreateDto
    const teacher: TeacherCreateDto = {
      teacherId: row.teacherId.trim(),
      firstName: row.firstName.trim(),
      lastName: row.lastName.trim(),
      email: row.email.trim().toLowerCase(),
      phone: row.phone.trim(),
      dateOfBirth: dateOfBirth,
      gender: row.gender.toLowerCase() as 'male' | 'female' | 'other',
      address: {
        street: row.street.trim(),
        city: row.city.trim(),
        state: row.state.trim(),
        zipCode: row.zipCode.trim(),
        country: row.country.trim()
      },
      qualifications: qualifications,
      subjects: subjects,
      experience: experience,
      joiningDate: joiningDate,
      salary: salary,
      emergencyContact: {
        name: row.emergencyContactName.trim(),
        relationship: row.emergencyContactRelationship.trim(),
        phone: row.emergencyContactPhone.trim()
      }
    };

    // Add optional fields if present
    if (row.profileImage && row.profileImage.trim()) {
      teacher.profileImage = row.profileImage.trim();
    }

    if (row.bloodGroup && row.bloodGroup.trim()) {
      teacher.bloodGroup = row.bloodGroup.trim();
    }

    if (row.bankAccountNumber && row.bankName && row.ifscCode) {
      teacher.bankDetails = {
        accountNumber: row.bankAccountNumber.trim(),
        bankName: row.bankName.trim(),
        ifscCode: row.ifscCode.trim()
      };
    }

    return teacher;
  }

  downloadCSVTemplate = asyncHandler(async (req: Request, res: Response) => {
    const csvTemplate = `teacherId,firstName,lastName,email,phone,dateOfBirth,gender,street,city,state,zipCode,country,qualifications,subjects,experience,joiningDate,salary,emergencyContactName,emergencyContactRelationship,emergencyContactPhone,profileImage,bloodGroup,bankAccountNumber,bankName,ifscCode
TCH001,John,Doe,john.doe@school.com,+1234567890,1985-06-15,male,123 Main St,Springfield,IL,62701,USA,B.Ed,Math,5,2020-08-01,50000,Jane Doe,Spouse,+1234567891,,A+,1234567890,ABC Bank,ABCD0123456
TCH002,Jane,Smith,jane.smith@school.com,+1234567892,1990-03-22,female,456 Oak Ave,Springfield,IL,62702,USA,"M.Sc Physics, B.Ed","Physics, Chemistry",3,2021-07-15,45000,Robert Smith,Spouse,+1234567893,,B+,9876543210,XYZ Bank,XYZD0654321`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="teacher_upload_template.csv"');
    res.send(csvTemplate);
  });
}

export default TeacherController;
