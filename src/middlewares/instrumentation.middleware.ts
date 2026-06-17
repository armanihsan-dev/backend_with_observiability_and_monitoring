import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../config/logger';
import { trace, context } from '@opentelemetry/api';
import {
    httpRequestCounter,
    httpRequestDuration,
    activeRequests,
    errorCounter,
} from '../config/metrics';

const tracer = trace.getTracer('express-middleware');

export const instrumentationMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const startTime = Date.now();
    const requestId = randomUUID();
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;

    // Create span and activate it in OTel context so traceId/spanId are real
    const span = tracer.startSpan(`${method} ${route}`, {
        attributes: {
            'http.method': method,
            'http.route': route,
            'http.url': req.url,
            'request.id': requestId,
        },
    });

    const activeContext = trace.setSpan(context.active(), span);
    const spanContext = span.spanContext();

    const requestLogger = logger.child({
        requestId,
        method,
        route,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
    });

    req.requestId = requestId;
    req.log = requestLogger;
    req.span = span;

    activeRequests.labels(method, route).inc();

    requestLogger.info({
        event: 'request_started',
        query: req.query,
        body: Object.keys(req.body || {}),
        headers: {
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent'],
        },
    }, 'Incoming request');

    // Run next() inside the active span context so child spans are correlated
    context.with(activeContext, () => {
        res.on('finish', () => {
            const duration = (Date.now() - startTime) / 1000;
            const statusCode = res.statusCode;

            httpRequestCounter.labels(method, route, statusCode.toString()).inc();
            httpRequestDuration.labels(method, route).observe(duration);
            activeRequests.labels(method, route).dec();

            span.setAttributes({
                'http.status_code': statusCode,
                'http.duration_ms': duration * 1000,
            });

            const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
            requestLogger[logLevel]({
                event: 'request_completed',
                statusCode,
                duration_ms: duration * 1000,
                contentLength: res.get('content-length'),
            }, 'Request completed');

            span.end();
        });

        res.on('error', (error) => {
            errorCounter.labels('response_error', route).inc();
            requestLogger.error({ error }, 'Response error occurred');
        });

        next();
    });
};

// Extend Request type
declare global {
    namespace Express {
        interface Request {
            requestId?: string;
            log?: any;
            span?: any;
        }
    }
}
