import express from 'express';
import { StudentController } from '../controllers/studentController';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { studentCreateSchema, objectIdSchema, paginationSchema, studentSearchSchema, studentExportSchema } from '../middleware/validation';
import { authorizeRoles } from '../middleware/auth';
import { uploadCSV } from '../utils/multerConfig';

const router = express.Router();
const studentController = new StudentController();

// GET /api/students/search - Must come before /:id route
router.get('/search', validateQuery(studentSearchSchema), studentController.searchStudents);

// GET /api/students/export - Must come before /:id route
router.get('/export', validateQuery(studentExportSchema), studentController.exportStudents);

// GET /api/students/csv-template
router.get('/csv-template',
  authorizeRoles('admin', 'staff'),
  studentController.downloadCSVTemplate
);

// GET /api/students/class/:className
router.get('/class/:className', studentController.getStudentsByClass);

// POST /api/students/bulk-upload
router.post('/bulk-upload',
  authorizeRoles('admin', 'staff'),
  uploadCSV.single('csvFile'),
  studentController.bulkUploadStudents
);

// GET /api/students
router.get('/', validateQuery(paginationSchema), studentController.getStudents);

// GET /api/students/:id
router.get('/:id', validateParams(objectIdSchema), studentController.getStudent);

// POST /api/students
router.post('/', 
  authorizeRoles('admin', 'staff'), 
  validateRequest(studentCreateSchema), 
  studentController.createStudent
);

// PUT /api/students/:id
router.put('/:id', 
  authorizeRoles('admin', 'staff'), 
  validateParams(objectIdSchema), 
  studentController.updateStudent
);

// DELETE /api/students/:id
router.delete('/:id', 
  authorizeRoles('admin'), 
  validateParams(objectIdSchema), 
  studentController.deleteStudent
);

// POST /api/students/:id/upload-photo
router.post('/:id/upload-photo', 
  authorizeRoles('admin', 'staff'), 
  validateParams(objectIdSchema), 
  studentController.uploadPhoto
);

export default router;
