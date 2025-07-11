import express from 'express';
import HomeworkController from '../controllers/homeworkController';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { objectIdSchema, paginationSchema } from '../middleware/validation';
import { authorizeRoles } from '../middleware/auth';

const router = express.Router();
const homeworkController = new HomeworkController();

// GET /api/homework
router.get('/', validateQuery(paginationSchema), homeworkController.getAllHomework);

// GET /api/homework/:id
router.get('/:id', validateParams(objectIdSchema), homeworkController.getHomeworkById);

// POST /api/homework
router.post('/', 
  authorizeRoles('admin', 'teacher'), 
  homeworkController.createHomework
);

// PUT /api/homework/:id
router.put('/:id', 
  authorizeRoles('admin', 'teacher'), 
  validateParams(objectIdSchema), 
  homeworkController.updateHomework
);

// DELETE /api/homework/:id
router.delete('/:id', 
  authorizeRoles('admin', 'teacher'), 
  validateParams(objectIdSchema), 
  homeworkController.deleteHomework
);

// GET /api/homework/class/:classId
router.get('/class/:classId', homeworkController.getHomeworkByClass);

// GET /api/homework/subject/:subject
router.get('/subject/:subject', homeworkController.getHomeworkBySubject);

// GET /api/homework/teacher/:teacherId
router.get('/teacher/:teacherId', homeworkController.getHomeworkByTeacher);

// POST /api/homework/:id/submit
router.post('/:id/submit', 
  validateParams(objectIdSchema), 
  homeworkController.submitHomework
);

// POST /api/homework/:id/grade
router.post('/:id/grade', 
  authorizeRoles('admin', 'teacher'), 
  validateParams(objectIdSchema), 
  homeworkController.gradeHomework
);

// GET /api/homework/due-today
router.get('/due-today', homeworkController.getHomeworkDueToday);

// GET /api/homework/overdue
router.get('/overdue', homeworkController.getOverdueHomework);

// POST /api/homework/:id/upload
router.post('/:id/upload', 
  authorizeRoles('admin', 'teacher'), 
  validateParams(objectIdSchema), 
  homeworkController.uploadHomeworkFile
);

export default router;
