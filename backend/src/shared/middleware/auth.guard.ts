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

  // 开发环境：允许特定的测试token通过
  if (env.nodeEnv === 'development') {
    // 测试token：test-token-123
    if (token === 'test-token-123') {
      return next();
    }
    // 其他开发token：以dev-开头的token
    if (token.startsWith('dev-')) {
      return next();
    }
  }

  try {
    jwt.verify(token, env.jwt.secret);
    return next();
  } catch {
    return fail(res, 401, ERROR_CODES.UNAUTHORIZED, 'invalid token');
  }
}
