import { Router } from 'express';
import { authController } from '../controllers';
import { validate, validateQuery } from '../middleware/validation';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { registerSchema, loginSchema, updateProfileSchema } from '../utils/schemas';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), authController.register.bind(authController));
router.post('/login', validate(loginSchema), authController.login.bind(authController));

// Protected routes
router.get('/me', authenticate, authController.me.bind(authController));
router.put('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile.bind(authController));

export default router;
