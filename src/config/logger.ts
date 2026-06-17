import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
    level: isDevelopment ? 'debug' : 'info',
    base: {
        service: process.env.OTEL_SERVICE_NAME || 'express-production-backend',
        environment: process.env.NODE_ENV,
    },
    transport: isDevelopment
        ? {
            targets: [
                // Console pretty print
                {
                    target: 'pino-pretty',
                    level: 'debug',
                    options: {
                        colorize: true,
                        translateTime: 'SYS:standard',
                        ignore: 'pid,hostname',
                        singleLine: false,
                        destination: 1,
                    },
                },
                // File (for Alloy/Loki)
                {
                    target: 'pino/file',
                    level: 'info',
                    options: {
                        destination: './logs/app.log',
                        mkdir: true,
                        append: true,
                    },
                },
            ],
        }
        : {
            targets: [
                // File (for Alloy/Loki)
                {
                    target: 'pino/file',
                    level: 'info',
                    options: {
                        destination: './logs/app.log',
                        mkdir: true,
                        append: true,
                    },
                },
            ],
        },
});

// Child logger for request context
export const createRequestLogger = (context: Record<string, any>) => {
    return logger.child(context);
};

export default logger;