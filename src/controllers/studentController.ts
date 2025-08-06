import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database';
import { Student, StudentCreateDto, StudentUpdateDto } from '../models/Student';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';

export class StudentController {
  
  getStudents = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const db = getDB();
    const students = await db.collection<Student>('students')
      .find({})
      .sort({ rollNumber: 1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .toArray();

    const total = await db.collection<Student>('students').countDocuments({});

    res.json({
      success: true,
      data: {
        students,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  });

  getStudent = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    const student = await db.collection<Student>('students').findOne({ _id: new ObjectId(id) });
    
    if (!student) {
      throw createError('Student not found', 404);
    }
    
    res.json({
      success: true,
      data: student
    });
  });

  createStudent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const studentData: StudentCreateDto = req.body;
    
    const db = getDB();
    
    // Check if student ID already exists
    const existingStudent = await db.collection<Student>('students').findOne({ 
      studentId: studentData.studentId 
    });
    
    if (existingStudent) {
      throw createError('Student ID already exists', 400);
    }
    
    // Check if roll number already exists in the same class and section
    const existingRollNumber = await db.collection<Student>('students').findOne({
      class: studentData.class,
      section: studentData.section,
      rollNumber: studentData.rollNumber
    });
    
    if (existingRollNumber) {
      throw createError('Roll number already exists in this class and section', 400);
    }
    
    const newStudent: Student = {
      ...studentData,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection<Student>('students').insertOne(newStudent);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newStudent
      }
    });
  });

  updateStudent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updateData: StudentUpdateDto = req.body;
    
    const db = getDB();
    
    const result = await db.collection<Student>('students').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Student not found', 404);
    }
    
    const updatedStudent = await db.collection<Student>('students').findOne({ _id: new ObjectId(id) });
    
    res.json({
      success: true,
      data: updatedStudent
    });
  });

  deleteStudent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    
    const db = getDB();
    
    const result = await db.collection<Student>('students').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          isActive: false,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw createError('Student not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  });

  getStudentsByClass = asyncHandler(async (req: Request, res: Response) => {
    const { className } = req.params;
    const { section } = req.query;
    
    const db = getDB();
    const filter: any = { class: className, isActive: true };
    
    if (section) {
      filter.section = section;
    }
    
    const students = await db.collection<Student>('students')
      .find(filter)
      .sort({ rollNumber: 1 })
      .toArray();
    
    res.json({
      success: true,
      data: students
    });
  });

  searchStudents = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const { q, class: className, section, status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Build search query
    const searchQuery: any = {};
    
    // Status filter
    if (status) {
      searchQuery.isActive = status === 'active';
    } else {
      searchQuery.isActive = true; // Default to active students
    }
    
    // Class filter
    if (className) {
      searchQuery.class = className;
    }
    
    // Section filter
    if (section) {
      searchQuery.section = section;
    }
    
    // Text search
    if (q) {
      const searchRegex = new RegExp(q as string, 'i');
      searchQuery.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { studentId: searchRegex },
        { rollNumber: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { 'parentInfo.fatherName': searchRegex },
        { 'parentInfo.motherName': searchRegex },
        { 'parentInfo.contactNumber': searchRegex }
      ];
    }
    
    const students = await db.collection<Student>('students')
      .find(searchQuery)
      .skip(skip)
      .limit(parseInt(limit as string))
      .toArray();
      
    const total = await db.collection<Student>('students').countDocuments(searchQuery);
    
    res.json({
      success: true,
      data: {
        students,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        },
        query: { q, class: className, section, status }
      }
    });
  });

  exportStudents = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    const { format, class: className, section, status, q } = req.query;
    
    // Build search query
    const searchQuery: any = {};
    
    // Status filter
    if (status) {
      searchQuery.isActive = status === 'active';
    } else {
      searchQuery.isActive = true; // Default to active students
    }
    
    // Class filter
    if (className) {
      searchQuery.class = className;
    }
    
    // Section filter
    if (section) {
      searchQuery.section = section;
    }
    
    // Text search
    if (q) {
      const searchRegex = new RegExp(q as string, 'i');
      searchQuery.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { studentId: searchRegex },
        { rollNumber: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { 'parentInfo.fatherName': searchRegex },
        { 'parentInfo.motherName': searchRegex },
        { 'parentInfo.contactNumber': searchRegex }
      ];
    }
    
    const students = await db.collection<Student>('students')
      .find(searchQuery)
      .toArray();
    
    if (format === 'csv') {
      // Generate CSV
      const csvHeader = [
        'Student ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Date of Birth',
        'Gender', 'Street', 'City', 'State', 'Zip Code', 'Country', 'Father Name',
        'Mother Name', 'Guardian Name', 'Parent Contact', 'Parent Email', 'Class',
        'Section', 'Roll Number', 'Admission Date', 'Status', 'Blood Group',
        'Medical Conditions', 'Emergency Contact Name', 'Emergency Contact Relationship',
        'Emergency Contact Phone'
      ].join(',');
      
      const csvRows = students.map(student => [
        student.studentId,
        student.firstName,
        student.lastName,
        student.email || '',
        student.phone || '',
        student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
        student.gender,
        student.address?.street || '',
        student.address?.city || '',
        student.address?.state || '',
        student.address?.zipCode || '',
        student.address?.country || '',
        student.parentInfo?.fatherName || '',
        student.parentInfo?.motherName || '',
        student.parentInfo?.guardianName || '',
        student.parentInfo?.contactNumber || '',
        student.parentInfo?.email || '',
        student.class,
        student.section,
        student.rollNumber,
        student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : '',
        student.isActive ? 'Active' : 'Inactive',
        student.bloodGroup || '',
        student.medicalConditions?.join('; ') || '',
        student.emergencyContact?.name || '',
        student.emergencyContact?.relationship || '',
        student.emergencyContact?.phone || ''
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
      res.setHeader('Content-Disposition', `attachment; filename="students_export_${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      // Default to JSON export
      res.json({
        success: true,
        data: {
          students,
          exportedAt: new Date().toISOString(),
          totalRecords: students.length,
          filters: { format, class: className, section, status, q }
        }
      });
    }
  });

  uploadPhoto = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    
    // In a real application, you would handle file upload here
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Photo uploaded successfully'
    });
  });

  bulkUploadStudents = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw createError('No CSV file uploaded', 400);
    }

    const filePath = req.file.path;
    const students: StudentCreateDto[] = [];
    const errors: string[] = [];
    const successfulUploads: any[] = [];
    const duplicateStudentIds: string[] = [];
    const duplicateRollNumbers: string[] = [];

    try {
      // Parse CSV file
      const csvData = await this.parseCSV(filePath);
      
      // Validate and process each row
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        try {
          const student = await this.validateAndMapCSVRow(row, i + 1);
          students.push(student);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Row ${i + 1}: ${errorMessage}`);
        }
      }

      // Check for existing students
      const db = getDB();
      const existingStudents = await db.collection<Student>('students')
        .find({ studentId: { $in: students.map(s => s.studentId) } })
        .toArray();

      const existingStudentIds = new Set(existingStudents.map(s => s.studentId));

      // Check for duplicate roll numbers in same class/section
      const rollNumberChecks = await Promise.all(
        students.map(async (student) => {
          const existing = await db.collection<Student>('students')
            .findOne({
              class: student.class,
              section: student.section,
              rollNumber: student.rollNumber
            });
          return { student, existing };
        })
      );

      const duplicateRollNumberStudents = rollNumberChecks
        .filter(check => check.existing)
        .map(check => `${check.student.rollNumber} (${check.student.class}-${check.student.section})`);

      // Filter out duplicates
      const newStudents = students.filter(student => {
        if (existingStudentIds.has(student.studentId)) {
          duplicateStudentIds.push(student.studentId);
          return false;
        }
        
        const hasDuplicateRollNumber = rollNumberChecks.some(check => 
          check.existing && 
          check.student.class === student.class && 
          check.student.section === student.section && 
          check.student.rollNumber === student.rollNumber
        );
        
        if (hasDuplicateRollNumber) {
          duplicateRollNumbers.push(`${student.rollNumber} (${student.class}-${student.section})`);
          return false;
        }
        
        return true;
      });

      // Insert new students
      if (newStudents.length > 0) {
        const studentsToInsert = newStudents.map(student => ({
          ...student,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        const result = await db.collection<Student>('students').insertMany(studentsToInsert);
        
        // Get the inserted students with their IDs
        const insertedStudents = await db.collection<Student>('students')
          .find({ _id: { $in: Object.values(result.insertedIds) } })
          .toArray();

        successfulUploads.push(...insertedStudents);
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        data: {
          totalRows: csvData.length,
          successfulUploads: successfulUploads.length,
          duplicateStudentIds: duplicateStudentIds.length,
          duplicateRollNumbers: duplicateRollNumbers.length,
          errors: errors.length,
          uploadedStudents: successfulUploads,
          duplicateStudentIdsList: duplicateStudentIds,
          duplicateRollNumbersList: duplicateRollNumbers,
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

  private async validateAndMapCSVRow(row: any, rowNumber: number): Promise<StudentCreateDto> {
    const requiredFields = [
      'studentId', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'street', 'city', 
      'state', 'zipCode', 'country', 'fatherName', 'motherName', 'parentContactNumber',
      'class', 'section', 'rollNumber', 'admissionDate', 'emergencyContactName',
      'emergencyContactRelationship', 'emergencyContactPhone'
    ];

    // Check for missing required fields
    for (const field of requiredFields) {
      if (!row[field] || row[field].trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate email format if provided
    if (row.email && row.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email)) {
        throw new Error('Invalid email format');
      }
    }

    // Validate parent email format if provided
    if (row.parentEmail && row.parentEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.parentEmail)) {
        throw new Error('Invalid parent email format');
      }
    }

    // Validate phone numbers (basic validation)
    const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
    if (row.phone && row.phone.trim() && !phoneRegex.test(row.phone)) {
      throw new Error('Invalid phone number format');
    }

    if (!phoneRegex.test(row.parentContactNumber)) {
      throw new Error('Invalid parent contact number format');
    }

    if (!phoneRegex.test(row.emergencyContactPhone)) {
      throw new Error('Invalid emergency contact phone format');
    }

    // Validate gender
    const validGenders = ['male', 'female', 'other'];
    if (!validGenders.includes(row.gender.toLowerCase())) {
      throw new Error('Invalid gender. Must be male, female, or other');
    }

    // Validate dates
    const dateOfBirth = new Date(row.dateOfBirth);
    const admissionDate = new Date(row.admissionDate);
    
    if (isNaN(dateOfBirth.getTime())) {
      throw new Error('Invalid date of birth format');
    }
    
    if (isNaN(admissionDate.getTime())) {
      throw new Error('Invalid admission date format');
    }

    // Parse arrays (medical conditions)
    const medicalConditions = row.medicalConditions 
      ? row.medicalConditions.split(',').map((condition: string) => condition.trim()).filter((condition: string) => condition)
      : [];

    // Map CSV row to StudentCreateDto
    const student: StudentCreateDto = {
      studentId: row.studentId.trim(),
      firstName: row.firstName.trim(),
      lastName: row.lastName.trim(),
      email: row.email ? row.email.trim() : undefined,
      phone: row.phone ? row.phone.trim() : undefined,
      dateOfBirth: dateOfBirth,
      gender: row.gender.toLowerCase() as 'male' | 'female' | 'other',
      address: {
        street: row.street.trim(),
        city: row.city.trim(),
        state: row.state.trim(),
        zipCode: row.zipCode.trim(),
        country: row.country.trim()
      },
      parentInfo: {
        fatherName: row.fatherName.trim(),
        motherName: row.motherName.trim(),
        guardianName: row.guardianName ? row.guardianName.trim() : undefined,
        contactNumber: row.parentContactNumber.trim(),
        email: row.parentEmail ? row.parentEmail.trim() : undefined
      },
      class: row.class.trim(),
      section: row.section.trim(),
      rollNumber: row.rollNumber.trim(),
      admissionDate: admissionDate,
      emergencyContact: {
        name: row.emergencyContactName.trim(),
        relationship: row.emergencyContactRelationship.trim(),
        phone: row.emergencyContactPhone.trim()
      }
    };

    // Add optional fields if present
    if (row.profileImage && row.profileImage.trim()) {
      student.profileImage = row.profileImage.trim();
    }

    if (row.bloodGroup && row.bloodGroup.trim()) {
      student.bloodGroup = row.bloodGroup.trim();
    }

    if (medicalConditions.length > 0) {
      student.medicalConditions = medicalConditions;
    }

    return student;
  }

  downloadCSVTemplate = asyncHandler(async (req: Request, res: Response) => {
    const csvTemplate = `studentId,firstName,lastName,email,phone,dateOfBirth,gender,street,city,state,zipCode,country,fatherName,motherName,guardianName,parentContactNumber,parentEmail,class,section,rollNumber,admissionDate,emergencyContactName,emergencyContactRelationship,emergencyContactPhone,profileImage,bloodGroup,medicalConditions
STU001,John,Doe,john.doe@student.com,+1234567890,2010-06-15,male,123 Main St,Springfield,IL,62701,USA,Robert Doe,Jane Doe,Robert Doe,+1234567891,parent@example.com,Grade 5,A,001,2023-08-15,Jane Doe,Mother,+1234567892,,A+,None
STU002,Jane,Smith,jane.smith@student.com,+1234567893,2009-03-22,female,456 Oak Ave,Springfield,IL,62702,USA,Michael Smith,Sarah Smith,,+1234567894,parent2@example.com,Grade 6,B,002,2023-08-15,Michael Smith,Father,+1234567895,,B+,"Allergic to nuts, Asthma"`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="student_upload_template.csv"');
    res.send(csvTemplate);
  });
}
