import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { rateLimit } from '../middlewares/rate-limit.middleware';
import { z } from 'zod';
import { validate } from '../middlewares/validation.middleware';

const router = Router();

// Validation schemas
const registerSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['user', 'admin', 'moderator']).optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const updateSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.enum(['user', 'admin', 'moderator']).optional(),
    is_active: z.boolean().optional(),
});

// Routes
router.post(
    '/register',
    rateLimit(10, 60000), // 10 requests per minute
    validate(registerSchema),
    UserController.register
);

router.post(
    '/login',
    rateLimit(20, 60000), // 20 requests per minute
    validate(loginSchema),
    UserController.login
);

router.get(
    '/profile',
    authenticate,
    UserController.getProfile
);

router.put(
    '/profile',
    authenticate,
    validate(updateSchema),
    UserController.updateProfile
);

router.get(
    '/users',
    authenticate,
    authorize('admin'),
    UserController.getAllUsers
);

export default router;