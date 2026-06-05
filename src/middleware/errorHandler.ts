import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  // Default error
  let statusCode = 500;
  let message = 'حدث خطأ في الخادم';

  // Validation errors
  if (err.validation) {
    statusCode = 400;
    message = 'بيانات غير صحيحة';
  }

  // Not found errors
  if (err.code === 'ENOTFOUND') {
    statusCode = 404;
    message = 'لم يتم العثور على المورد';
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
