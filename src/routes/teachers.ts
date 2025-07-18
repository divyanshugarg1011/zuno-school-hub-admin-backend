import express from 'express';
import TeacherController from '../controllers/teacherController';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { teacherCreateSchema, objectIdSchema, paginationSchema, teacherSearchSchema, teacherExportSchema } from '../middleware/validation';
import { authorizeRoles } from '../middleware/auth';
import { uploadCSV, uploadTeacherPhoto } from '../utils/multerConfig';

const router = express.Router();
const teacherController = new TeacherController();

// GET /api/teachers/search - Must come before /:id route
router.get('/search', validateQuery(teacherSearchSchema), teacherController.searchTeachers);

// GET /api/teachers/export - Must come before /:id route
router.get('/export', validateQuery(teacherExportSchema), teacherController.exportTeachers);

// GET /api/teachers/csv-template
router.get('/csv-template',
  authorizeRoles('admin'),
  teacherController.downloadCSVTemplate
);

// GET /api/teachers/subject/:subject
router.get('/subject/:subject', teacherController.getTeachersBySubject);

// GET /api/teachers/class/:classId
router.get('/class/:classId', teacherController.getTeachersByClass);

// POST /api/teachers/bulk-upload
router.post('/bulk-upload',
  authorizeRoles('admin'),
  uploadCSV.single('csvFile'),
  teacherController.bulkUploadTeachers
);

// GET /api/teachers
router.get('/', validateQuery(paginationSchema), teacherController.getAllTeachers);

// GET /api/teachers/:id
router.get('/:id', validateParams(objectIdSchema), teacherController.getTeacherById);

// POST /api/teachers
router.post('/', 
  authorizeRoles('admin'), 
  validateRequest(teacherCreateSchema), 
  teacherController.createTeacher
);

// PUT /api/teachers/:id
router.put('/:id', 
  authorizeRoles('admin'), 
  validateParams(objectIdSchema), 
  teacherController.updateTeacher
);

// DELETE /api/teachers/:id
router.delete('/:id', 
  authorizeRoles('admin'), 
  validateParams(objectIdSchema), 
  teacherController.deleteTeacher
);

// POST /api/teachers/:id/upload-photo
router.post('/:id/upload-photo', 
  authorizeRoles('admin'), 
  validateParams(objectIdSchema),
  uploadTeacherPhoto.single('photo'),
  teacherController.uploadTeacherPhoto
);

// POST /api/teachers/:id/assign-class
router.post('/:id/assign-class', 
  authorizeRoles('admin'), 
  validateParams(objectIdSchema), 
  teacherController.assignClassToTeacher
);

// POST /api/teachers/:id/remove-class
router.post('/:id/remove-class', 
  authorizeRoles('admin'), 
  validateParams(objectIdSchema), 
  teacherController.removeClassFromTeacher
);

export default router;
