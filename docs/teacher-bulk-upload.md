# Teacher Bulk Upload Documentation

## Overview

The Teacher Bulk Upload feature allows administrators to upload multiple teacher records at once using a CSV file. This feature includes validation, duplicate checking, and error reporting.

## API Endpoints

### 1. Bulk Upload Teachers

**POST** `/api/teachers/bulk-upload`

**Authorization:** Admin only

**Content-Type:** `multipart/form-data`

**Parameters:**
- `csvFile` (file): CSV file containing teacher data

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRows": 10,
    "successfulUploads": 8,
    "duplicates": 1,
    "errors": 1,
    "uploadedTeachers": [...],
    "duplicateEmails": ["john.doe@school.com"],
    "validationErrors": ["Row 3: Invalid email format"]
  }
}
```

### 2. Download CSV Template

**GET** `/api/teachers/csv-template`

**Authorization:** Admin only

**Response:** CSV file with headers and sample data

## CSV Format

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| teacherId | string | Unique teacher identifier | TCH001 |
| firstName | string | Teacher's first name | John |
| lastName | string | Teacher's last name | Doe |
| email | string | Valid email address | john.doe@school.com |
| phone | string | Phone number | +1234567890 |
| dateOfBirth | date | Date of birth (YYYY-MM-DD) | 1985-06-15 |
| gender | string | Gender (male/female/other) | male |
| street | string | Street address | 123 Main St |
| city | string | City | Springfield |
| state | string | State | IL |
| zipCode | string | ZIP code | 62701 |
| country | string | Country | USA |
| qualifications | string | Comma-separated qualifications | B.Ed, M.Sc |
| subjects | string | Comma-separated subjects | Math, Physics |
| experience | number | Years of experience | 5 |
| joiningDate | date | Joining date (YYYY-MM-DD) | 2020-08-01 |
| salary | number | Monthly salary | 50000 |
| emergencyContactName | string | Emergency contact name | Jane Doe |
| emergencyContactRelationship | string | Emergency contact relationship | Spouse |
| emergencyContactPhone | string | Emergency contact phone | +1234567891 |

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| profileImage | string | URL to profile image | https://example.com/photo.jpg |
| bloodGroup | string | Blood group | A+ |
| bankAccountNumber | string | Bank account number | 1234567890 |
| bankName | string | Bank name | ABC Bank |
| ifscCode | string | IFSC code | ABCD0123456 |

## Sample CSV

```csv
teacherId,firstName,lastName,email,phone,dateOfBirth,gender,street,city,state,zipCode,country,qualifications,subjects,experience,joiningDate,salary,emergencyContactName,emergencyContactRelationship,emergencyContactPhone,profileImage,bloodGroup,bankAccountNumber,bankName,ifscCode
TCH001,John,Doe,john.doe@school.com,+1234567890,1985-06-15,male,123 Main St,Springfield,IL,62701,USA,B.Ed,Math,5,2020-08-01,50000,Jane Doe,Spouse,+1234567891,,A+,1234567890,ABC Bank,ABCD0123456
TCH002,Jane,Smith,jane.smith@school.com,+1234567892,1990-03-22,female,456 Oak Ave,Springfield,IL,62702,USA,"M.Sc Physics, B.Ed","Physics, Chemistry",3,2021-07-15,45000,Robert Smith,Spouse,+1234567893,,B+,9876543210,XYZ Bank,XYZD0654321
```

## Validation Rules

### Data Validation
- **Email:** Must be a valid email format
- **Phone:** Must contain only digits, spaces, hyphens, parentheses, and optional plus sign
- **Gender:** Must be one of: male, female, other
- **Date of Birth:** Must be a valid date in YYYY-MM-DD format
- **Joining Date:** Must be a valid date in YYYY-MM-DD format
- **Experience:** Must be a non-negative integer
- **Salary:** Must be a positive number
- **Qualifications:** Must contain at least one qualification (comma-separated)
- **Subjects:** Must contain at least one subject (comma-separated)

### Business Rules
- **Duplicate Check:** Teachers with existing email addresses will be skipped
- **Required Fields:** All required fields must be present and non-empty
- **File Size:** Maximum 5MB CSV file size
- **File Type:** Only CSV files are accepted

## Error Handling

### Common Errors

1. **Missing Required Field**
   - Error: "Row 3: Missing required field: email"
   - Solution: Ensure all required fields are filled

2. **Invalid Email Format**
   - Error: "Row 5: Invalid email format"
   - Solution: Use valid email format (user@domain.com)

3. **Invalid Date Format**
   - Error: "Row 7: Invalid date of birth format"
   - Solution: Use YYYY-MM-DD format

4. **Duplicate Email**
   - Error: Teacher with email already exists
   - Solution: Remove duplicate entries or use different email

5. **File Upload Error**
   - Error: "No CSV file uploaded"
   - Solution: Ensure file is selected and has .csv extension

## Usage Instructions

### Frontend Implementation

1. **File Upload Form**
```html
<form enctype="multipart/form-data">
  <input type="file" name="csvFile" accept=".csv" required>
  <button type="submit">Upload Teachers</button>
</form>
```

2. **JavaScript Example**
```javascript
const formData = new FormData();
formData.append('csvFile', fileInput.files[0]);

fetch('/api/teachers/bulk-upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Upload result:', data);
});
```

### Download Template

```javascript
fetch('/api/teachers/csv-template', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
.then(response => response.blob())
.then(blob => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'teacher_upload_template.csv';
  a.click();
});
```

## Best Practices

1. **Data Preparation**
   - Validate data in spreadsheet before export
   - Use consistent date formats
   - Remove special characters from names
   - Verify email addresses are unique

2. **File Management**
   - Keep file size under 5MB
   - Use UTF-8 encoding
   - Test with small batches first

3. **Error Handling**
   - Review validation errors before re-upload
   - Fix data issues in source file
   - Handle duplicates appropriately

4. **Security**
   - Only allow admin users to upload
   - Validate file types on frontend and backend
   - Sanitize all input data

## Notes

- Uploaded CSV files are automatically deleted after processing
- All timestamps are automatically added (createdAt, updatedAt)
- Teachers are marked as active by default
- Large uploads may take time to process
- Check the response for detailed results including errors and duplicates
