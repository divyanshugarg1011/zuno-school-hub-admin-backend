# Fee Bulk Upload Feature

## Overview
The fee bulk upload feature allows administrators and staff to upload multiple fee records at once using a CSV file. This feature is similar to the existing teacher and student bulk upload functionality.

## API Endpoints

### 1. Download CSV Template
- **URL**: `GET /api/fees/csv-template`
- **Authorization**: Admin only
- **Description**: Downloads a CSV template with the correct headers and sample data
- **Response**: CSV file download

### 2. Bulk Upload Fees
- **URL**: `POST /api/fees/bulk-upload`
- **Authorization**: Admin or Staff
- **Content-Type**: `multipart/form-data`
- **Body**: CSV file with field name `csvFile`
- **Description**: Uploads and processes a CSV file containing fee records

## CSV Format

### Required Fields
1. **studentId** - MongoDB ObjectId of the student (24-character hex string)
2. **feeType** - Type of fee (tuition, transport, library, sports, examination, other)
3. **amount** - Fee amount (positive number)
4. **dueDate** - Due date in YYYY-MM-DD format
5. **academicYear** - Academic year in YYYY-YYYY format (e.g., 2023-2024)

### Optional Fields
1. **month** - Month name (january, february, march, etc.) - for monthly fees
2. **description** - Additional description for the fee

### Sample CSV Content
```csv
studentId,feeType,amount,dueDate,academicYear,month,description
507f1f77bcf86cd799439011,tuition,5000,2024-01-15,2023-2024,january,Monthly tuition fee
507f1f77bcf86cd799439012,transport,1500,2024-01-15,2023-2024,january,Monthly transport fee
507f1f77bcf86cd799439013,library,500,2024-01-15,2023-2024,,Annual library fee
507f1f77bcf86cd799439014,sports,2000,2024-01-15,2023-2024,,Annual sports fee
```

## Validation Rules

### Student ID Validation
- Must be a valid MongoDB ObjectId (24-character hexadecimal string)
- Student must exist in the database

### Fee Type Validation
- Must be one of: tuition, transport, library, sports, examination, other
- Case-insensitive

### Amount Validation
- Must be a positive number
- Decimal values are allowed

### Due Date Validation
- Must be in YYYY-MM-DD format
- Must be a valid date

### Academic Year Validation
- Must be in YYYY-YYYY format (e.g., 2023-2024)

### Month Validation (Optional)
- Must be a valid month name (january through december)
- Case-insensitive
- Can be empty for non-monthly fees

## Duplicate Prevention
The system prevents duplicate fee records based on the combination of:
- Student ID
- Fee Type
- Academic Year
- Month (if provided)

If a duplicate is found, it will be listed in the response but not inserted.

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "totalRows": 6,
    "successfulUploads": 4,
    "duplicates": 1,
    "errors": 1,
    "uploadedFees": [
      {
        "_id": "...",
        "studentId": "507f1f77bcf86cd799439011",
        "feeType": "tuition",
        "amount": 5000,
        "dueDate": "2024-01-15T00:00:00.000Z",
        "status": "pending",
        "academicYear": "2023-2024",
        "month": "january",
        "description": "Monthly tuition fee",
        "createdAt": "2024-07-19T...",
        "updatedAt": "2024-07-19T..."
      }
    ],
    "duplicateFees": [
      "tuition for student 507f1f77bcf86cd799439011 in 2023-2024 (january)"
    ],
    "validationErrors": [
      "Row 3: Invalid student ID format"
    ]
  }
}
```

## Error Handling

### File Upload Errors
- No file uploaded: 400 Bad Request
- Invalid file format: 400 Bad Request
- File size too large: 413 Payload Too Large

### Validation Errors
- Missing required fields
- Invalid data formats
- Student not found
- Invalid fee type or month

### System Errors
- Database connection issues
- File processing errors

## Usage Instructions

1. **Download Template**: First, download the CSV template using the `/csv-template` endpoint
2. **Fill Data**: Fill in your fee data following the template format
3. **Upload File**: Use the `/bulk-upload` endpoint with your CSV file
4. **Review Results**: Check the response for successful uploads, duplicates, and errors
5. **Handle Errors**: Fix any validation errors and re-upload if necessary

## Security Considerations

- Only administrators and staff can perform bulk uploads
- File size is limited to 5MB
- Only CSV files are accepted
- Student existence is verified before creating fees
- Duplicate prevention helps maintain data integrity

## File Storage

- Uploaded CSV files are temporarily stored in the `/uploads/csv/` directory
- Files are automatically deleted after processing (success or failure)
- File names include timestamps to prevent conflicts

## Integration with Existing Features

This bulk upload feature integrates seamlessly with:
- Existing fee management endpoints
- Student management system (validates student IDs)
- Fee statistics and reporting
- Payment processing workflows
