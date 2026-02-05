import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Error:', err);

  // Handle known operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.message,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
    });
  }

  // Handle database errors
  if (err.name === 'DatabaseError' || (err as any).code?.startsWith?.('23')) {
    const pgError = err as any;

    // Unique constraint violation
    if (pgError.code === '23505') {
      return res.status(409).json({
        error: 'Resource already exists',
      });
    }

    // Foreign key violation
    if (pgError.code === '23503') {
      return res.status(400).json({
        error: 'Referenced resource not found',
      });
    }
  }

  // Default error response
  const statusCode = (err as AppError).statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({
    error: `Route ${req.method} ${req.url} not found`,
  });
}
