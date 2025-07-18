#!/usr/bin/env node

/**
 * Test script for Teacher Bulk Upload functionality
 * This script tests the CSV parsing and validation logic
 */

const fs = require('fs');
const path = require('path');

// Create a sample CSV file for testing
const sampleCSV = `teacherId,firstName,lastName,email,phone,dateOfBirth,gender,street,city,state,zipCode,country,qualifications,subjects,experience,joiningDate,salary,emergencyContactName,emergencyContactRelationship,emergencyContactPhone,profileImage,bloodGroup,bankAccountNumber,bankName,ifscCode
TCH001,John,Doe,john.doe@school.com,+1234567890,1985-06-15,male,123 Main St,Springfield,IL,62701,USA,B.Ed,Math,5,2020-08-01,50000,Jane Doe,Spouse,+1234567891,,A+,1234567890,ABC Bank,ABCD0123456
TCH002,Jane,Smith,jane.smith@school.com,+1234567892,1990-03-22,female,456 Oak Ave,Springfield,IL,62702,USA,"M.Sc Physics, B.Ed","Physics, Chemistry",3,2021-07-15,45000,Robert Smith,Spouse,+1234567893,,B+,9876543210,XYZ Bank,XYZD0654321
TCH003,Invalid,User,invalid-email,+1234567894,1988-12-10,male,789 Pine Rd,Springfield,IL,62703,USA,B.Sc,Science,7,2019-06-01,55000,Emergency Contact,Father,+1234567895,,O+,5555555555,DEF Bank,DEFG0987654
TCH004,Missing,Fields,missing.fields@school.com,+1234567896,1992-04-18,female,321 Elm St,Springfield,IL,62704,USA,,,2,2022-01-10,40000,Missing Contact,Mother,+1234567897,,AB+,7777777777,GHI Bank,GHIJ0456789`;

// Create test CSV file
const testDir = path.join(__dirname, 'test');
if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
}

const testCSVPath = path.join(testDir, 'test-teachers.csv');
fs.writeFileSync(testCSVPath, sampleCSV);

console.log('✅ Test CSV file created at:', testCSVPath);
console.log('\nTest CSV contains:');
console.log('- 2 valid teacher records');
console.log('- 1 record with invalid email');
console.log('- 1 record with missing required fields');
console.log('\nYou can use this file to test the bulk upload functionality');
console.log('\nTo test the API:');
console.log('1. Start the server: npm run dev');
console.log('2. Use the demo HTML file at: public/teacher-bulk-upload-demo.html');
console.log('3. Or use curl:');
console.log(`   curl -X POST http://localhost:3000/api/teachers/bulk-upload \\
     -H "Authorization: Bearer YOUR_TOKEN" \\
     -F "csvFile=@${testCSVPath}"`);

console.log('\nTo download the template:');
console.log('   curl -X GET http://localhost:3000/api/teachers/csv-template \\');
console.log('     -H "Authorization: Bearer YOUR_TOKEN" \\');
console.log('     -o teacher_template.csv');
