import express from 'express';
import { AuthController } from '../controllers/authController';
import { validateRequest } from '../middleware/validation';
import { userLoginSchema, userCreateSchema } from '../middleware/validation';

const router = express.Router();
const authController = new AuthController();

// POST /api/auth/login
router.post('/login', validateRequest(userLoginSchema), authController.login);

// POST /api/auth/register
router.post('/register', validateRequest(userCreateSchema), authController.register);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me
router.get('/me', authController.getProfile);

// POST /api/auth/refresh
router.post('/refresh', authController.refreshToken);

// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword);

export default router;
