# Zuno School Hub Admin Backend

A comprehensive backend API for the Zuno School Hub Admin system, built with Node.js, Express, TypeScript, and MongoDB.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Student Management**: Complete CRUD operations for student records
- **Teacher Management**: Teacher profile management and assignment tracking
- **Bulk Upload**: CSV bulk upload functionality for both students and teachers with validation and error reporting
- **Attendance Tracking**: Mark and track student attendance with detailed reporting
- **Homework Management**: Create, assign, and grade homework assignments
- **Fee Management**: Track fee payments and generate receipts
- **Communication System**: Announcements, notices, and messaging
- **Reports & Analytics**: Comprehensive reporting for all modules
- **File Upload**: Support for profile pictures and document uploads
- **Search & Export**: Advanced search and export functionality for students and teachers
- **Security**: Rate limiting, input validation, and secure password hashing

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: Joi
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/divyanshugarg1011/zuno-school-hub-admin-backend.git
   cd zuno-school-hub-admin-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration.

4. Build the project:
   ```bash
   npm run build
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`.

## Bulk Upload Feature

The system now supports bulk upload of both teacher and student data via CSV files. This feature includes:

### Features:
- **CSV Template Download**: Get properly formatted CSV templates for both students and teachers
- **Bulk Validation**: Comprehensive validation of all data with detailed error reporting
- **Duplicate Detection**: Automatic detection and handling of duplicates
  - **Teachers**: Duplicate email detection
  - **Students**: Duplicate student ID and roll number detection (per class-section)
- **Error Reporting**: Detailed error reporting for each row
- **Partial Success**: Successfully process valid records even if some fail
- **Search & Export**: Advanced search and export functionality

### Usage:
**Teachers:**
1. **Download Template**: `GET /api/teachers/csv-template`
2. **Upload CSV**: `POST /api/teachers/bulk-upload`
3. **Search**: `GET /api/teachers/search`
4. **Export**: `GET /api/teachers/export`

**Students:**
1. **Download Template**: `GET /api/students/csv-template`
2. **Upload CSV**: `POST /api/students/bulk-upload`
3. **Search**: `GET /api/students/search`
4. **Export**: `GET /api/students/export`

### CSV Formats:
**Teacher CSV:** teacherId, firstName, lastName, email, phone, dateOfBirth, gender, address fields, qualifications, subjects, experience, joiningDate, salary, emergencyContact fields, bankDetails (optional)

**Student CSV:** studentId, firstName, lastName, email, phone, dateOfBirth, gender, address fields, parentInfo fields, class, section, rollNumber, admissionDate, emergencyContact fields, medicalConditions (optional)

### Demo:
Demo HTML pages are available for testing the bulk upload functionality:
- Teachers: `public/teacher-bulk-upload-demo.html`
- Students: Similar demo can be created for student uploads

For detailed documentation:
- [Teacher Bulk Upload Documentation](docs/teacher-bulk-upload.md)
- [Student Bulk Upload Documentation](docs/student-bulk-upload.md)