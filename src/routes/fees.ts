import express from 'express';
import FeeController from '../controllers/feeController';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { feeCreateSchema, objectIdSchema, paginationSchema, feeSearchSchema, feeExportSchema, studentIdSchema } from '../middleware/validation';
import { authorizeRoles } from '../middleware/auth';
import { uploadCSV } from '../utils/multerConfig';

const router = express.Router();
const feeController = new FeeController();

// GET /api/fees/search - Must come before /:id route
router.get('/search', validateQuery(feeSearchSchema), feeController.searchFees);

// GET /api/fees/export - Must come before /:id route
router.get('/export', validateQuery(feeExportSchema), feeController.exportFees);

// GET /api/fees/statistics (must come before /:id route)
router.get('/statistics', feeController.getFeeStatistics);

// GET /api/fees/pending (must come before /:id route)
router.get('/pending', feeController.getPendingFees);

// GET /api/fees/overdue (must come before /:id route)
router.get('/overdue', feeController.getOverdueFees);

// GET /api/fees/reports (must come before /:id route)
router.get('/reports', feeController.generateFeeReport);

// GET /api/fees/csv-template
router.get('/csv-template',
  authorizeRoles('admin', 'staff'),
  feeController.downloadCSVTemplate
);

// GET /api/fees/student/:studentId
router.get('/student/:studentId', 
  validateParams(studentIdSchema), 
  feeController.getFeesByStudent
);

// GET /api/fees/class/:classId
router.get('/class/:classId', feeController.getFeesByClass);

// POST /api/fees/bulk-upload
router.post('/bulk-upload',
  authorizeRoles('admin', 'staff'),
  uploadCSV.single('csvFile'),
  feeController.bulkUploadFees
);

// GET /api/fees
router.get('/', validateQuery(paginationSchema), feeController.getAllFees);

// GET /api/fees/:id
router.get('/:id', validateParams(objectIdSchema), feeController.getFeeById);

// POST /api/fees
router.post('/', 
  authorizeRoles('admin', 'staff'), 
  validateRequest(feeCreateSchema),
  feeController.createFee
);

// PUT /api/fees/:id
router.put('/:id', 
  authorizeRoles('admin', 'staff'), 
  validateParams(objectIdSchema), 
  feeController.updateFee
);

// DELETE /api/fees/:id
router.delete('/:id', 
  authorizeRoles('admin'), 
  validateParams(objectIdSchema), 
  feeController.deleteFee
);

// POST /api/fees/:id/pay
router.post('/:id/pay', 
  authorizeRoles('admin', 'staff'), 
  validateParams(objectIdSchema), 
  feeController.payFee
);

// POST /api/fees/:id/reminder
router.post('/:id/reminder', 
  authorizeRoles('admin', 'staff'), 
  validateParams(objectIdSchema), 
  feeController.sendFeeReminder
);

// POST /api/fees/:id/discount
router.post('/:id/discount', 
  authorizeRoles('admin'), 
  validateParams(objectIdSchema), 
  feeController.applyDiscount
);

export default router;
