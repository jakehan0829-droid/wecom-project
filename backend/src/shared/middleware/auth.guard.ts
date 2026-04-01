import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../infra/config/env.js';
import { ERROR_CODES } from '../constants/error-codes.js';
import { fail } from '../utils/http.js';

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return fail(res, 401, ERROR_CODES.UNAUTHORIZED, 'missing bearer token');
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    jwt.verify(token, env.jwt.secret);
    return next();
  } catch {
    return fail(res, 401, ERROR_CODES.UNAUTHORIZED, 'invalid token');
  }
}
