import type { Request, Response } from 'express';
import { ERROR_CODES } from '../constants/error-codes.js';
import { fail } from '../utils/http.js';

export function notFoundHandler(_req: Request, res: Response) {
  return fail(res, 404, ERROR_CODES.NOT_FOUND, 'route not found');
}
