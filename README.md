# Zuno School Hub Admin Backend

A comprehensive backend API for the Zuno School Hub Admin system, built with Node.js, Express, TypeScript, and MongoDB.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Student Management**: Complete CRUD operations for student records
- **Teacher Management**: Teacher profile management and assignment tracking
- **Attendance Tracking**: Mark and track student attendance with detailed reporting
- **Homework Management**: Create, assign, and grade homework assignments
- **Fee Management**: Track fee payments and generate receipts
- **Communication System**: Announcements, notices, and messaging
- **Reports & Analytics**: Comprehensive reporting for all modules
- **File Upload**: Support for profile pictures and document uploads
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