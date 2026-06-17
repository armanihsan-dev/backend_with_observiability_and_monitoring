import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();

// HTTP Request Counter
export const httpRequestCounter = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

// HTTP Request Duration Histogram
export const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
});

// Active Requests Gauge
export const activeRequests = new Gauge({
    name: 'http_requests_active',
    help: 'Number of active HTTP requests',
    labelNames: ['method', 'route'],
    registers: [register],
});

// Database Query Duration
export const dbQueryDuration = new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [register],
});

// Redis Operation Duration
export const redisOperationDuration = new Histogram({
    name: 'redis_operation_duration_seconds',
    help: 'Redis operation duration in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
    registers: [register],
});

// Error Counter
export const errorCounter = new Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'route'],
    registers: [register],
});

// User Activity Counter
export const userActivityCounter = new Counter({
    name: 'user_activity_total',
    help: 'User activity events',
    labelNames: ['action', 'user_id'],
    registers: [register],
});

// Register default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });


export default {
    register,
    httpRequestCounter,
    httpRequestDuration,
    activeRequests,
    dbQueryDuration,
    redisOperationDuration,
    errorCounter,
    userActivityCounter,
};