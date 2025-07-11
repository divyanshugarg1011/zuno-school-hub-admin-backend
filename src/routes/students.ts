import express from 'express';
import { StudentController } from '../controllers/studentController';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { studentCreateSchema, objectIdSchema, paginationSchema } from '../middleware/validation';
import { authorizeRoles } from '../middleware/auth';

const router = express.Router();
const studentController = new StudentController();

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

// GET /api/students/class/:className
router.get('/class/:className', studentController.getStudentsByClass);

// GET /api/students/search
router.get('/search', studentController.searchStudents);

// POST /api/students/:id/upload-photo
router.post('/:id/upload-photo', 
  authorizeRoles('admin', 'staff'), 
  validateParams(objectIdSchema), 
  studentController.uploadPhoto
);

export default router;
