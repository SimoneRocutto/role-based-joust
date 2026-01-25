import type { Request, Response, NextFunction } from "express";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  stack?: string;
}

/**
 * Global error handling middleware
 * Must be registered last in Express app
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Default error values
  let statusCode = 500;
  let message = "Internal Server Error";
  let isOperational = false;

  // If it's our custom ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  } else if (err.name === "ValidationError") {
    // Validation errors
    statusCode = 400;
    message = err.message;
    isOperational = true;
  } else if (err.name === "UnauthorizedError") {
    // JWT/Auth errors
    statusCode = 401;
    message = "Unauthorized";
    isOperational = true;
  } else if (err.message) {
    // Generic error with message
    message = err.message;
  }

  // Log error
  const logLevel = statusCode >= 500 ? "error" : "warn";
  logger[logLevel]("ERROR", `${req.method} ${req.path} - ${statusCode}`, {
    statusCode,
    message,
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    stack: err.stack,
    isOperational,
  });

  // If non-operational error in production, log but don't expose details
  if (!isOperational && process.env.NODE_ENV === "production") {
    message = "An unexpected error occurred";
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    error: err.name || "Error",
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Helper function to create API errors
 */
export function createError(
  message: string,
  statusCode: number = 500
): ApiError {
  return new ApiError(message, statusCode);
}

/**
 * Async error wrapper for route handlers
 * Catches errors from async functions and passes to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new ApiError(`Route ${req.method} ${req.path} not found`, 404);
  next(error);
}
