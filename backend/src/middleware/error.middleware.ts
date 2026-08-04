import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _next: NextFunction
): void => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation Error',
      message: err.message,
    });
    return;
  }

  if (err.name === 'AuthenticationError') {
    res.status(401).json({
      error: 'Authentication Error',
      message: err.message,
    });
    return;
  }

  if (err.name === 'AuthorizationError') {
    res.status(403).json({
      error: 'Authorization Error',
      message: err.message,
    });
    return;
  }

  // Default error
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Произошла внутренняя ошибка сервера',
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not Found',
    message: `Маршрут ${req.method} ${req.path} не найден`,
  });
};