import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import configs
import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './config/logger';

// Import middlewares
import { instrumentationMiddleware } from './middlewares/instrumentation.middleware';
import { errorHandler } from './middlewares/error.middleware';

// Import routes
import userRoutes from './routes/user.routes';

// Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Instrumentation middleware (logs, metrics, traces)
app.use(instrumentationMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        requestId: req.requestId,
    });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
    try {
        const { register } = await import('./config/metrics');
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).send('Error collecting metrics');
    }
});

// API routes
app.use('/api/v1', userRoutes);

// 404 handler
app.use((req, res) => {
    const error = new Error(`Route ${req.method} ${req.originalUrl} not found`);
    (error as any).statusCode = 404;
    throw error;
});

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
    try {
        // Connect to database
        await connectDB();

        // Connect to Redis
        await connectRedis();

        app.listen(4400, () => {
            logger.info(`🚀 Server running on http://localhost:${PORT}`);
            logger.info(`📊 Metrics endpoint: http://localhost:${PORT}/metrics`);
            logger.info(`❤️  Health endpoint: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        logger.error({ error }, 'Failed to start server');
        process.exit(1);
    }
};

startServer();

export default app;