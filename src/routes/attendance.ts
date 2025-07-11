import express from 'express';
import { AttendanceController } from '../controllers/attendanceController';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { objectIdSchema, paginationSchema } from '../middleware/validation';
import { authorizeRoles } from '../middleware/auth';

const router = express.Router();
const attendanceController = new AttendanceController();

// GET /api/attendance
router.get('/', validateQuery(paginationSchema), attendanceController.getAttendance);

// GET /api/attendance/:id
router.get('/:id', validateParams(objectIdSchema), attendanceController.getAttendanceById);

// POST /api/attendance
router.post('/', 
  authorizeRoles('admin', 'teacher', 'staff'), 
  attendanceController.markAttendance
);

// PUT /api/attendance/:id
router.put('/:id', 
  authorizeRoles('admin', 'teacher', 'staff'), 
  validateParams(objectIdSchema), 
  attendanceController.updateAttendance
);

// DELETE /api/attendance/:id
router.delete('/:id', 
  authorizeRoles('admin'), 
  validateParams(objectIdSchema), 
  attendanceController.deleteAttendance
);

// GET /api/attendance/student/:studentId
router.get('/student/:studentId', 
  validateParams(objectIdSchema), 
  attendanceController.getStudentAttendance
);

// GET /api/attendance/class/:className
router.get('/class/:className', attendanceController.getClassAttendance);

// GET /api/attendance/date/:date
router.get('/date/:date', attendanceController.getAttendanceByDate);

// GET /api/attendance/report/:studentId
router.get('/report/:studentId', 
  validateParams(objectIdSchema), 
  attendanceController.getAttendanceReport
);

// POST /api/attendance/bulk
router.post('/bulk', 
  authorizeRoles('admin', 'teacher', 'staff'), 
  attendanceController.bulkMarkAttendance
);

export default router;
