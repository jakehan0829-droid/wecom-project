import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '../constants/error-codes.js';
import { AppError } from '../errors/app-error.js';
import { fail } from '../utils/http.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestMeta = {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip
  };

  if (err instanceof AppError) {
    console.error('[app-error]', JSON.stringify({
      ...requestMeta,
      code: err.code,
      statusCode: err.statusCode,
      message: err.message
    }));

    return fail(res, err.statusCode, err.code, err.message);
  }

  console.error('[error]', JSON.stringify({
    ...requestMeta,
    message: err instanceof Error ? err.message : String(err)
  }));
  console.error(err);
  return fail(res, 500, ERROR_CODES.INTERNAL_ERROR, 'internal server error');
}
