import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { CreateUserDTO, LoginUserDTO } from '../models/user.model';
import { userActivityCounter } from '../config/metrics';
import { logger } from '../config/logger';
import { trace } from '@opentelemetry/api';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const tracer = trace.getTracer('user-controller');

export class UserController {
    static async register(req: Request, res: Response, next: NextFunction) {
        const span = tracer.startSpan('user-register');

        try {
            span.setAttribute('user.email', req.body.email);

            const data: CreateUserDTO = req.body;
            const user = await userService.create(data);

            logger.info({ userId: user.id, email: user.email }, 'User registered successfully');

            span.setAttribute('user.id', user.id);
            span.end();

            userActivityCounter.labels('register', user.id).inc();

            res.status(201).json({
                success: true,
                data: { id: user.id, name: user.name, email: user.email, role: user.role },
            });
        } catch (error) {
            span.recordException(error as Error);
            span.end();
            next(error);
        }
    }

    static async login(req: Request, res: Response, next: NextFunction) {
        const span = tracer.startSpan('user-login');

        try {
            const { email, password } = req.body as LoginUserDTO;

            span.setAttribute('user.email', email);

            // Find user
            const user = await userService.findByEmail(email);

            if (!user) {
                logger.warn({ email }, 'Login attempt with non-existent email');
                span.setAttribute('login.success', false);
                span.end();

                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials',
                });
            }

            // Check password
            const isValid = await bcrypt.compare(password, user.password_hash);

            if (!isValid) {
                logger.warn({ userId: user.id, email }, 'Login attempt with invalid password');
                span.setAttribute('login.success', false);
                span.end();

                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials',
                });
            }

            // Update last login
            await userService.update(user.id, {});

            // Generate JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

            span.setAttribute('user.id', user.id);
            span.setAttribute('login.success', true);
            span.end();

            userActivityCounter.labels('login', user.id).inc();

            res.json({
                success: true,
                data: {
                    token,
                    user: { id: user.id, name: user.name, email: user.email, role: user.role },
                },
            });
        } catch (error) {
            span.recordException(error as Error);
            span.end();
            next(error);
        }
    }

    static async getProfile(req: Request, res: Response, next: NextFunction) {
        const span = tracer.startSpan('get-profile');
        span.setAttribute('user.id', req.userId || 'unknown');

        try {
            const userId = req.userId;

            if (!userId) {
                span.end();
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
            }

            const user = await userService.findById(userId);

            if (!user) {
                span.end();
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }

            logger.info({ userId: user.id }, 'User profile fetched');

            span.end();

            res.json({
                success: true,
                data: { id: user.id, name: user.name, email: user.email, role: user.role },
            });
        } catch (error) {
            span.recordException(error as Error);
            span.end();
            next(error);
        }
    }

    static async updateProfile(req: Request, res: Response, next: NextFunction) {
        const span = tracer.startSpan('update-profile');

        try {
            const userId = req.userId;
            const updates = req.body;

            span.setAttribute('user.id', userId || 'unknown');

            if (!userId) {
                span.end();
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
            }

            const user = await userService.update(userId, updates);

            if (!user) {
                span.end();
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }

            logger.info({ userId: user.id }, 'User profile updated');

            span.end();

            res.json({
                success: true,
                data: { id: user.id, name: user.name, email: user.email, role: user.role },
            });
        } catch (error) {
            span.recordException(error as Error);
            span.end();
            next(error);
        }
    }

    static async getAllUsers(req: Request, res: Response, next: NextFunction) {
        const span = tracer.startSpan('get-all-users');

        try {
            const limit = parseInt(req.query.limit as string) || 100;
            const offset = parseInt(req.query.offset as string) || 0;

            span.setAttribute('query.limit', limit);
            span.setAttribute('query.offset', offset);

            const users = await userService.getAll(limit, offset);

            logger.info({ count: users.length }, 'All users fetched');

            span.end();

            res.json({
                success: true,
                data: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
                pagination: { limit, offset, total: users.length },
            });
        } catch (error) {
            span.recordException(error as Error);
            span.end();
            next(error);
        }
    }
}