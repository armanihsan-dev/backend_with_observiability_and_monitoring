import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userRole?: string;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing',
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing',
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      userId: string;
      email: string;
      role: string;
    };
    
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    
    logger.debug({ userId: decoded.userId }, 'User authenticated');
    
    next();
  } catch (error) {
    logger.error({ error }, 'Authentication error');
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {

    
    if (!req.userRole || !roles.includes(req.userRole)) {
      logger.warn({ role: req.userRole, requiredRoles: roles }, 'Unauthorized access attempt');


      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }
    next();
  };
};