const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Mock setup for testing fee bulk upload
const app = express();
app.use(express.json());

// Mock CSV upload configuration
const upload = multer({ 
  dest: 'uploads/csv/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Mock fee controller
class MockFeeController {
  downloadCSVTemplate = (req, res) => {
    const csvTemplate = `studentId,feeType,amount,dueDate,academicYear,month,description
507f1f77bcf86cd799439011,tuition,5000,2024-01-15,2023-2024,january,Monthly tuition fee
507f1f77bcf86cd799439012,transport,1500,2024-01-15,2023-2024,january,Monthly transport fee
507f1f77bcf86cd799439013,library,500,2024-01-15,2023-2024,,Annual library fee
507f1f77bcf86cd799439014,sports,2000,2024-01-15,2023-2024,,Annual sports fee`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="fee_upload_template.csv"');
    res.send(csvTemplate);
  };

  bulkUploadFees = (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file uploaded'
      });
    }

    // Mock successful upload response
    res.json({
      success: true,
      data: {
        totalRows: 4,
        successfulUploads: 4,
        duplicates: 0,
        errors: 0,
        uploadedFees: [
          {
            _id: "66a123456789abcdef123456",
            studentId: "507f1f77bcf86cd799439011",
            feeType: "tuition",
            amount: 5000,
            dueDate: "2024-01-15T00:00:00.000Z",
            status: "pending",
            academicYear: "2023-2024",
            month: "january",
            description: "Monthly tuition fee"
          }
        ],
        duplicateFees: [],
        validationErrors: []
      }
    });

    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  };
}

const feeController = new MockFeeController();

// Routes
app.get('/api/fees/csv-template', feeController.downloadCSVTemplate);
app.post('/api/fees/bulk-upload', upload.single('csvFile'), feeController.bulkUploadFees);

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Fee bulk upload test server running on port ${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log('GET /api/fees/csv-template - Download CSV template');
  console.log('POST /api/fees/bulk-upload - Upload CSV file');
  console.log('\nTest with:');
  console.log(`curl -X GET http://localhost:${PORT}/api/fees/csv-template`);
  console.log(`curl -X POST -F "csvFile=@test/test-fees.csv" http://localhost:${PORT}/api/fees/bulk-upload`);
});
