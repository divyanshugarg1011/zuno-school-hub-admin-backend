import express from 'express';
import { ReportController } from '../controllers/reportController';
import { validateParams, validateQuery } from '../middleware/validation';
import { objectIdSchema, paginationSchema } from '../middleware/validation';
import { authorizeRoles } from '../middleware/auth';

const router = express.Router();
const reportController = new ReportController();

// GET /api/reports/dashboard
router.get('/dashboard', reportController.getDashboardData);

// GET /api/reports/students
router.get('/students', validateQuery(paginationSchema), reportController.getStudentReport);

// GET /api/reports/teachers
router.get('/teachers', validateQuery(paginationSchema), reportController.getTeacherReport);

// GET /api/reports/attendance
router.get('/attendance', reportController.getAttendanceReport);

// GET /api/reports/attendance/student/:studentId
router.get('/attendance/student/:studentId', 
  validateParams(objectIdSchema), 
  reportController.getStudentAttendanceReport
);

// GET /api/reports/attendance/class/:className
router.get('/attendance/class/:className', reportController.getClassAttendanceReport);

// GET /api/reports/fees
router.get('/fees', reportController.getFeeReport);

// GET /api/reports/fees/student/:studentId
router.get('/fees/student/:studentId', 
  validateParams(objectIdSchema), 
  reportController.getStudentFeeReport
);

// GET /api/reports/fees/overdue
router.get('/fees/overdue', reportController.getOverdueFeeReport);

// GET /api/reports/homework
router.get('/homework', reportController.getHomeworkReport);

// GET /api/reports/homework/student/:studentId
router.get('/homework/student/:studentId', 
  validateParams(objectIdSchema), 
  reportController.getStudentHomeworkReport
);

// GET /api/reports/homework/class/:className
router.get('/homework/class/:className', reportController.getClassHomeworkReport);

// GET /api/reports/academic-performance
router.get('/academic-performance', reportController.getAcademicPerformanceReport);

// GET /api/reports/export/students
router.get('/export/students', 
  authorizeRoles('admin'), 
  reportController.exportStudentData
);

// GET /api/reports/export/attendance
router.get('/export/attendance', 
  authorizeRoles('admin'), 
  reportController.exportAttendanceData
);

// GET /api/reports/export/fees
router.get('/export/fees', 
  authorizeRoles('admin'), 
  reportController.exportFeeData
);

export default router;
