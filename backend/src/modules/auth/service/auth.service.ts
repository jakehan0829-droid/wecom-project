import jwt, { type SignOptions } from 'jsonwebtoken';
import { db } from '../../../infra/db/pg.js';
import { env } from '../../../infra/config/env.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/constants/error-codes.js';
import { requireString } from '../../../shared/utils/validators.js';

export async function loginService(payload: Record<string, unknown>) {
  const mobile = requireString(payload.mobile, 'mobile');
  const password = requireString(payload.password, 'password');

  const result = await db.query(
    `select id, name, mobile, password_hash as "passwordHash" from user_account where mobile = $1 limit 1`,
    [mobile]
  );

  const user = result.rows[0] || null;
  if (!user) {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'user not found');
  }

  if (user.passwordHash !== password) {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'password incorrect');
  }

  const signOptions: SignOptions = {
    expiresIn: env.jwt.expiresIn as SignOptions['expiresIn']
  };

  const accessToken = jwt.sign(
    { sub: user.id, mobile: user.mobile },
    env.jwt.secret,
    signOptions
  );

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      mobile: user.mobile
    }
  };
}
