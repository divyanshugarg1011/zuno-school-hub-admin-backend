import express from 'express';
import CommunicationController from '../controllers/communicationController';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { objectIdSchema, paginationSchema } from '../middleware/validation';
import { authorizeRoles } from '../middleware/auth';

const router = express.Router();
const communicationController = new CommunicationController();

// GET /api/communication
router.get('/', validateQuery(paginationSchema), communicationController.getAllCommunications);

// GET /api/communication/:id
router.get('/:id', validateParams(objectIdSchema), communicationController.getCommunicationById);

// POST /api/communication
router.post('/', 
  authorizeRoles('admin', 'teacher', 'staff'), 
  communicationController.createCommunication
);

// PUT /api/communication/:id
router.put('/:id', 
  authorizeRoles('admin', 'teacher', 'staff'), 
  validateParams(objectIdSchema), 
  communicationController.updateCommunication
);

// DELETE /api/communication/:id
router.delete('/:id', 
  authorizeRoles('admin'), 
  validateParams(objectIdSchema), 
  communicationController.deleteCommunication
);

// GET /api/communication/type/:type
router.get('/type/:type', communicationController.getCommunicationsByType);

// GET /api/communication/unread/:userId
router.get('/unread/:userId', 
  validateParams(objectIdSchema), 
  communicationController.getUnreadCommunications
);

// POST /api/communication/:id/read
router.post('/:id/read', 
  validateParams(objectIdSchema), 
  communicationController.markAsRead
);

// GET /api/communication/recipient/:recipientId
router.get('/recipient/:recipientId', 
  validateParams(objectIdSchema), 
  communicationController.getCommunicationsByRecipient
);

export default router;
