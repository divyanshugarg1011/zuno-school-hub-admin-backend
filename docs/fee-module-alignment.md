# Fee Module CSV Upload Design Alignment

## Overview
The fee module has been updated to follow the same design pattern as the students and teachers modules for CSV upload functionality.

## Design Pattern Comparison

### Route Structure
All three modules now follow the same route ordering pattern:

1. **Search routes** (before /:id to avoid conflicts)
2. **Export routes** (before /:id to avoid conflicts)
3. **Specific feature routes** (statistics, pending, etc.)
4. **CSV template download**
5. **Sub-resource routes** (student/:studentId, class/:classId, etc.)
6. **Bulk upload route**
7. **Main CRUD routes** (GET /, GET /:id, POST /, PUT /:id, DELETE /:id)

### Authorization Consistency

| Route | Students | Teachers | Fees |
|-------|----------|----------|------|
| CSV Template | admin, staff | admin | admin, staff |
| Bulk Upload | admin, staff | admin | admin, staff |
| Create | admin, staff | admin | admin, staff |
| Update | admin, staff | admin | admin, staff |
| Delete | admin | admin | admin |

### Validation Schemas
Added comprehensive validation schemas for fees:
- `feeSearchSchema` - For search/filtering functionality
- `feeExportSchema` - For export functionality
- `feeCreateSchema` - For creating new fees
- `studentIdSchema` - For validating student ID parameters

### Controller Methods
Added missing controller methods to match the pattern:
- `searchFees()` - Advanced search with filters
- `exportFees()` - Export fees in CSV/JSON format

## New Features Added

### 1. Advanced Search (`GET /api/fees/search`)
**Query Parameters:**
- `q` - Text search in description
- `status` - pending, paid, overdue, partial
- `feeType` - tuition, transport, library, sports, examination, other
- `studentId` - 24-character MongoDB ObjectId
- `academicYear` - YYYY-YYYY format (e.g., 2023-2024)
- `month` - january through december
- `page`, `limit` - Pagination

**Example:**
```
GET /api/fees/search?status=pending&feeType=tuition&academicYear=2023-2024&page=1&limit=10
```

### 2. Export Functionality (`GET /api/fees/export`)
**Query Parameters:**
- `format` - csv or json (default: json)
- All search parameters from above

**CSV Export includes:**
- Fee ID, Student ID, Fee Type, Amount, Due Date
- Status, Academic Year, Month, Description
- Created At, Updated At

**Example:**
```
GET /api/fees/export?format=csv&status=pending&academicYear=2023-2024
```

### 3. Enhanced Validation
**Fee Creation Validation:**
- Student ID must be valid MongoDB ObjectId
- Student must exist in database
- Fee type must be valid enum value
- Amount must be positive number
- Due date must be valid date
- Academic year must follow YYYY-YYYY pattern
- Month must be valid month name (if provided)

## API Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/fees/search` | Advanced search with filters | Token |
| GET | `/api/fees/export` | Export fees (CSV/JSON) | Token |
| GET | `/api/fees/statistics` | Fee statistics | Token |
| GET | `/api/fees/pending` | Get pending fees | Token |
| GET | `/api/fees/overdue` | Get overdue fees | Token |
| GET | `/api/fees/reports` | Generate fee reports | Token |
| GET | `/api/fees/csv-template` | Download CSV template | Admin/Staff |
| GET | `/api/fees/student/:studentId` | Get fees by student | Token |
| GET | `/api/fees/class/:classId` | Get fees by class | Token |
| POST | `/api/fees/bulk-upload` | Bulk upload via CSV | Admin/Staff |
| GET | `/api/fees` | Get all fees (paginated) | Token |
| GET | `/api/fees/:id` | Get fee by ID | Token |
| POST | `/api/fees` | Create new fee | Admin/Staff |
| PUT | `/api/fees/:id` | Update fee | Admin/Staff |
| DELETE | `/api/fees/:id` | Delete fee | Admin |
| POST | `/api/fees/:id/pay` | Record payment | Admin/Staff |
| POST | `/api/fees/:id/reminder` | Send reminder | Admin/Staff |
| POST | `/api/fees/:id/discount` | Apply discount | Admin |

## Files Modified

### 1. Routes (`src/routes/fees.ts`)
- ✅ Added search and export routes
- ✅ Reordered routes to match pattern
- ✅ Added proper validation middleware
- ✅ Updated authorization to match students module

### 2. Controller (`src/controllers/feeController.ts`)
- ✅ Added `searchFees()` method
- ✅ Added `exportFees()` method
- ✅ Enhanced CSV export functionality

### 3. Validation (`src/middleware/validation.ts`)
- ✅ Added `feeSearchSchema`
- ✅ Added `feeExportSchema`
- ✅ Added `feeCreateSchema`
- ✅ Added `studentIdSchema`

## Testing the New Features

### 1. Test Search Functionality
```bash
curl -X GET "http://localhost:3000/api/fees/search?status=pending&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Export Functionality
```bash
curl -X GET "http://localhost:3000/api/fees/export?format=csv&status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test CSV Template Download
```bash
curl -X GET "http://localhost:3000/api/fees/csv-template" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Test Bulk Upload
```bash
curl -X POST "http://localhost:3000/api/fees/bulk-upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "csvFile=@test/test-fees.csv"
```

## Benefits of This Alignment

1. **Consistency** - All modules follow the same pattern
2. **Maintainability** - Easier to maintain and extend
3. **Usability** - Consistent API across all modules
4. **Scalability** - Easy to add new features following the same pattern
5. **Validation** - Comprehensive input validation
6. **Security** - Proper authorization controls
