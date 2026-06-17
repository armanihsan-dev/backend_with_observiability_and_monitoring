import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { errorCounter } from '../config/metrics';
import { trace } from '@opentelemetry/api';

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (
    err: AppError | Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err.message || 'Internal Server Error';
    const route = req.route?.path || req.path || 'unknown';
    const requestId = req.requestId || 'unknown';

    // Record error metric
    errorCounter
        .labels(
            err instanceof AppError ? 'operational' : 'system',
            route
        )
        .inc();

    // Get span from request if available
    const span = req.span;
    if (span) {
        span.recordException(err);
        span.setStatus({
            code: 1, // ERROR
            message: message,
        });
    }

    // Log error
    if (statusCode >= 500) {
        logger.error({
            error: err.message,
            stack: err.stack,
            statusCode,
            route,
            requestId,
        }, 'Internal server error');
    } else if (statusCode >= 400) {
        logger.warn({
            error: err.message,
            statusCode,
            route,
            requestId,
        }, 'Client error');
    }

    res.status(statusCode).json({
        success: false,
        message: statusCode >= 500 ? 'Internal Server Error' : message,
        statusCode,
        requestId,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
        }),
    });
};