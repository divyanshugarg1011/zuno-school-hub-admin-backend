# Student Bulk Upload Documentation

## Overview

The Student Bulk Upload feature allows administrators and staff to upload multiple student records at once using a CSV file. This feature includes validation, duplicate checking, and error reporting for both student IDs and roll numbers.

## API Endpoints

### 1. Bulk Upload Students

**POST** `/api/students/bulk-upload`

**Authorization:** Admin or Staff

**Content-Type:** `multipart/form-data`

**Parameters:**
- `csvFile` (file): CSV file containing student data

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRows": 10,
    "successfulUploads": 7,
    "duplicateStudentIds": 2,
    "duplicateRollNumbers": 1,
    "errors": 0,
    "uploadedStudents": [...],
    "duplicateStudentIdsList": ["STU001", "STU002"],
    "duplicateRollNumbersList": ["001 (Grade 5-A)"],
    "validationErrors": []
  }
}
```

### 2. Download CSV Template

**GET** `/api/students/csv-template`

**Authorization:** Admin or Staff

**Response:** CSV file with headers and sample data

### 3. Search Students

**GET** `/api/students/search`

**Query Parameters:**
- `q`: Search query (optional)
- `class`: Filter by class (optional)
- `section`: Filter by section (optional)
- `status`: Filter by status (optional) - 'active' or 'inactive'
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

### 4. Export Students

**GET** `/api/students/export`

**Query Parameters:**
- `format`: Export format (optional) - 'csv' or 'json' (default: 'json')
- `class`: Filter by class (optional)
- `section`: Filter by section (optional)
- `status`: Filter by status (optional) - 'active' or 'inactive'
- `q`: Search query (optional)

## CSV Format

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| studentId | string | Unique student identifier | STU001 |
| firstName | string | Student's first name | John |
| lastName | string | Student's last name | Doe |
| dateOfBirth | date | Date of birth (YYYY-MM-DD) | 2010-06-15 |
| gender | string | Gender (male/female/other) | male |
| street | string | Street address | 123 Main St |
| city | string | City | Springfield |
| state | string | State | IL |
| zipCode | string | ZIP code | 62701 |
| country | string | Country | USA |
| fatherName | string | Father's name | Robert Doe |
| motherName | string | Mother's name | Jane Doe |
| parentContactNumber | string | Parent's contact number | +1234567891 |
| class | string | Student's class | Grade 5 |
| section | string | Student's section | A |
| rollNumber | string | Roll number | 001 |
| admissionDate | date | Admission date (YYYY-MM-DD) | 2023-08-15 |
| emergencyContactName | string | Emergency contact name | Jane Doe |
| emergencyContactRelationship | string | Emergency contact relationship | Mother |
| emergencyContactPhone | string | Emergency contact phone | +1234567892 |

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| email | string | Student's email address | john.doe@student.com |
| phone | string | Student's phone number | +1234567890 |
| guardianName | string | Guardian's name | Robert Doe |
| parentEmail | string | Parent's email address | parent@example.com |
| profileImage | string | URL to profile image | https://example.com/photo.jpg |
| bloodGroup | string | Blood group | A+ |
| medicalConditions | string | Comma-separated medical conditions | Allergic to nuts, Asthma |

## Sample CSV

```csv
studentId,firstName,lastName,email,phone,dateOfBirth,gender,street,city,state,zipCode,country,fatherName,motherName,guardianName,parentContactNumber,parentEmail,class,section,rollNumber,admissionDate,emergencyContactName,emergencyContactRelationship,emergencyContactPhone,profileImage,bloodGroup,medicalConditions
STU001,John,Doe,john.doe@student.com,+1234567890,2010-06-15,male,123 Main St,Springfield,IL,62701,USA,Robert Doe,Jane Doe,Robert Doe,+1234567891,parent@example.com,Grade 5,A,001,2023-08-15,Jane Doe,Mother,+1234567892,,A+,None
STU002,Jane,Smith,jane.smith@student.com,+1234567893,2009-03-22,female,456 Oak Ave,Springfield,IL,62702,USA,Michael Smith,Sarah Smith,,+1234567894,parent2@example.com,Grade 6,B,002,2023-08-15,Michael Smith,Father,+1234567895,,B+,"Allergic to nuts, Asthma"
```

## Validation Rules

### Data Validation
- **Email:** Must be a valid email format (if provided)
- **Phone Numbers:** Must contain only digits, spaces, hyphens, parentheses, and optional plus sign
- **Gender:** Must be one of: male, female, other
- **Date of Birth:** Must be a valid date in YYYY-MM-DD format
- **Admission Date:** Must be a valid date in YYYY-MM-DD format
- **Medical Conditions:** Comma-separated list (if provided)

### Business Rules
- **Student ID Uniqueness:** Student IDs must be unique across the system
- **Roll Number Uniqueness:** Roll numbers must be unique within the same class and section
- **Required Fields:** All required fields must be present and non-empty
- **File Size:** Maximum 5MB CSV file size
- **File Type:** Only CSV files are accepted

## Error Handling

### Common Errors

1. **Missing Required Field**
   - Error: "Row 3: Missing required field: studentId"
   - Solution: Ensure all required fields are filled

2. **Invalid Email Format**
   - Error: "Row 5: Invalid email format"
   - Solution: Use valid email format (user@domain.com)

3. **Invalid Date Format**
   - Error: "Row 7: Invalid date of birth format"
   - Solution: Use YYYY-MM-DD format

4. **Duplicate Student ID**
   - Error: Student ID already exists
   - Solution: Use unique student IDs

5. **Duplicate Roll Number**
   - Error: Roll number already exists in the same class and section
   - Solution: Use unique roll numbers within class-section combination

## Search and Export Features

### Search Capabilities
- **Text Search:** firstName, lastName, studentId, rollNumber, email, phone, parent names, parent contact
- **Class Filter:** Filter by specific class
- **Section Filter:** Filter by specific section
- **Status Filter:** active/inactive students
- **Pagination:** Proper pagination support

### Export Capabilities
- **CSV Format:** Complete student data with proper CSV formatting
- **JSON Format:** Structured data with export metadata
- **Filtering:** Apply same filters as search
- **All Records:** No pagination limit for exports

## Usage Examples

### Frontend Implementation

```javascript
// Bulk Upload
const formData = new FormData();
formData.append('csvFile', fileInput.files[0]);

fetch('/api/students/bulk-upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log('Upload result:', data));

// Search Students
fetch('/api/students/search?q=john&class=Grade%205&status=active', {
  headers: { 'Authorization': 'Bearer ' + token }
})
.then(response => response.json())
.then(data => console.log('Search results:', data));

// Export Students
fetch('/api/students/export?format=csv&class=Grade%205', {
  headers: { 'Authorization': 'Bearer ' + token }
})
.then(response => response.blob())
.then(blob => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'students_export.csv';
  a.click();
});
```

### API Usage Examples

```bash
# Bulk upload students
curl -X POST http://localhost:3000/api/students/bulk-upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "csvFile=@students.csv"

# Search students
curl -X GET "http://localhost:3000/api/students/search?q=john&class=Grade%205" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Export students as CSV
curl -X GET "http://localhost:3000/api/students/export?format=csv&class=Grade%205" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o students_export.csv

# Download template
curl -X GET http://localhost:3000/api/students/csv-template \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o student_template.csv
```

## Best Practices

1. **Data Preparation**
   - Validate data in spreadsheet before export
   - Use consistent date formats
   - Ensure student IDs are unique
   - Check roll number uniqueness per class-section

2. **File Management**
   - Keep file size under 5MB
   - Use UTF-8 encoding
   - Test with small batches first

3. **Duplicate Handling**
   - Review duplicate reports before re-upload
   - Consider updating existing records instead of creating new ones
   - Maintain roll number uniqueness within class-section

4. **Security**
   - Only allow authorized users to upload
   - Validate file types on frontend and backend
   - Sanitize all input data

## Notes

- Uploaded CSV files are automatically deleted after processing
- All timestamps are automatically added (createdAt, updatedAt)
- Students are marked as active by default
- Large uploads may take time to process
- Both student ID and roll number duplicates are checked and reported separately
- Medical conditions can be comma-separated for multiple conditions
