#!/usr/bin/env node

/**
 * Test script for Student Bulk Upload functionality
 * This script tests the CSV parsing and validation logic
 */

const fs = require('fs');
const path = require('path');

// Create a sample CSV file for testing
const sampleCSV = `studentId,firstName,lastName,email,phone,dateOfBirth,gender,street,city,state,zipCode,country,fatherName,motherName,guardianName,parentContactNumber,parentEmail,class,section,rollNumber,admissionDate,emergencyContactName,emergencyContactRelationship,emergencyContactPhone,profileImage,bloodGroup,medicalConditions
STU001,John,Doe,john.doe@student.com,+1234567890,2010-06-15,male,123 Main St,Springfield,IL,62701,USA,Robert Doe,Jane Doe,Robert Doe,+1234567891,parent@example.com,Grade 5,A,001,2023-08-15,Jane Doe,Mother,+1234567892,,A+,None
STU002,Jane,Smith,jane.smith@student.com,+1234567893,2009-03-22,female,456 Oak Ave,Springfield,IL,62702,USA,Michael Smith,Sarah Smith,,+1234567894,parent2@example.com,Grade 6,B,002,2023-08-15,Michael Smith,Father,+1234567895,,B+,"Allergic to nuts, Asthma"
STU003,Invalid,Email,invalid-email,+1234567896,2011-01-10,male,789 Pine Rd,Springfield,IL,62703,USA,David Email,Mary Email,,+1234567897,invalid@email,Grade 4,C,003,2023-08-15,David Email,Father,+1234567898,,O+,None
STU004,Missing,Fields,missing.fields@student.com,+1234567899,2010-08-20,female,321 Elm St,Springfield,IL,62704,USA,,,+1234567900,parent4@example.com,Grade 5,A,004,2023-08-15,Missing Contact,Mother,+1234567901,,AB+,Diabetes`;

// Create test directory
const testDir = path.join(__dirname, 'test');
if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
}

const testCSVPath = path.join(testDir, 'test-students.csv');
fs.writeFileSync(testCSVPath, sampleCSV);

console.log('✅ Test CSV file created at:', testCSVPath);
console.log('\nTest CSV contains:');
console.log('- 2 valid student records');
console.log('- 1 record with invalid email format');
console.log('- 1 record with missing required fields (fatherName, motherName)');
console.log('\nYou can use this file to test the bulk upload functionality');
console.log('\nTo test the API:');
console.log('1. Start the server: npm run dev');
console.log('2. Use the API endpoints:');
console.log(`   curl -X POST http://localhost:3000/api/students/bulk-upload \\
     -H "Authorization: Bearer YOUR_TOKEN" \\
     -F "csvFile=@${testCSVPath}"`);

console.log('\nTo download the template:');
console.log('   curl -X GET http://localhost:3000/api/students/csv-template \\');
console.log('     -H "Authorization: Bearer YOUR_TOKEN" \\');
console.log('     -o student_template.csv');

console.log('\nTo search students:');
console.log('   curl -X GET "http://localhost:3000/api/students/search?q=john&class=Grade%205" \\');
console.log('     -H "Authorization: Bearer YOUR_TOKEN"');

console.log('\nTo export students:');
console.log('   curl -X GET "http://localhost:3000/api/students/export?format=csv&class=Grade%205" \\');
console.log('     -H "Authorization: Bearer YOUR_TOKEN" \\');
console.log('     -o students_export.csv');
