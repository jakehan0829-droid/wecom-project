import type { Response } from 'express';

export function ok(res: Response, data: unknown) {
  return res.status(200).json({ success: true, data, error: null });
}

export function created(res: Response, data: unknown) {
  return res.status(201).json({ success: true, data, error: null });
}

export function fail(res: Response, statusCode: number, code: string, message: string) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code,
      message
    }
  });
}
