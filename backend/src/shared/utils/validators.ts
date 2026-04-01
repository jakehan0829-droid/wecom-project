import { AppError } from '../errors/app-error.js';
import { ERROR_CODES } from '../constants/error-codes.js';

export function requireString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `${fieldName} is required`);
  }
  return value;
}

export function requireEnum(value: unknown, fieldName: string, allowed: string[]) {
  const normalized = requireString(value, fieldName);
  if (!allowed.includes(normalized)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `${fieldName} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}

export function requireNumberLike(value: unknown, fieldName: string) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `${fieldName} must be a valid number`);
  }
  return num;
}
