import express from 'express';
import FeeController from '../controllers/feeController';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { objectIdSchema, paginationSchema } from '../middleware/validation';
import { authorizeRoles } from '../middleware/auth';

const router = express.Router();
const feeController = new FeeController();

// GET /api/fees
router.get('/', validateQuery(paginationSchema), feeController.getAllFees);

// GET /api/fees/:id
router.get('/:id', validateParams(objectIdSchema), feeController.getFeeById);

// POST /api/fees
router.post('/', 
  authorizeRoles('admin', 'staff'), 
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

// GET /api/fees/student/:studentId
router.get('/student/:studentId', 
  validateParams(objectIdSchema), 
  feeController.getFeesByStudent
);

// GET /api/fees/class/:classId
router.get('/class/:classId', feeController.getFeesByClass);

// GET /api/fees/pending
router.get('/pending', feeController.getPendingFees);

// GET /api/fees/overdue
router.get('/overdue', feeController.getOverdueFees);

// POST /api/fees/:id/pay
router.post('/:id/pay', 
  authorizeRoles('admin', 'staff'), 
  validateParams(objectIdSchema), 
  feeController.payFee
);

// GET /api/fees/reports
router.get('/reports', feeController.generateFeeReport);

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

// GET /api/fees/statistics
router.get('/statistics', feeController.getFeeStatistics);

export default router;
