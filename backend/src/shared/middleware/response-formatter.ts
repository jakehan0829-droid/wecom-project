import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// 标准API响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  requestId?: string;
  timestamp: string;
}

// 扩展Express Response类型
declare global {
  namespace Express {
    interface Response {
      apiSuccess: <T = any>(data: T, statusCode?: number) => void;
      apiError: (code: string, message: string, statusCode?: number, details?: any) => void;
    }
  }
}

/**
 * 响应格式化中间件
 * 为所有API响应提供统一的格式
 */
export function responseFormatter(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  const startTime = Date.now();

  // 设置响应头
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);

  // 添加API响应方法
  res.apiSuccess = function<T = any>(data: T, statusCode: number = 200) {
    const response: ApiResponse<T> = {
      success: true,
      data,
      error: null,
      requestId,
      timestamp: new Date().toISOString(),
    };

    this.status(statusCode).json(response);
  };

  res.apiError = function(code: string, message: string, statusCode: number = 500, details?: any) {
    const response: ApiResponse = {
      success: false,
      data: null,
      error: {
        code,
        message,
        details,
      },
      requestId,
      timestamp: new Date().toISOString(),
    };

    this.status(statusCode).json(response);
  };

  // 包装res.json方法以确保统一格式
  const originalJson = res.json;
  res.json = function(body: any) {
    // 如果已经是标准格式，直接返回
    if (body && typeof body === 'object' && 'success' in body) {
      return originalJson.call(this, {
        ...body,
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    // 如果不是标准格式，包装为标准格式
    const formattedBody: ApiResponse = {
      success: true,
      data: body,
      error: null,
      requestId,
      timestamp: new Date().toISOString(),
    };

    return originalJson.call(this, formattedBody);
  };

  // 捕获未处理的错误
  const originalSend = res.send;
  res.send = function(body: any) {
    // 只处理非JSON响应
    if (typeof body === 'string' && !res.get('Content-Type')?.includes('application/json')) {
      return originalSend.call(this, body);
    }

    return originalSend.call(this, body);
  };

  next();
}

/**
 * 错误处理中间件
 * 捕获所有未处理的错误并格式化为标准响应
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // 如果响应已经发送，跳过
  if (res.headersSent) {
    return next(err);
  }

  const requestId = res.getHeader('X-Request-ID') as string || 'unknown';

  // 默认错误信息
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'Internal server error';
  let details: any = undefined;

  // 处理不同类型的错误
  if (err.status && err.code && err.message) {
    // 应用错误（AppError）
    statusCode = err.status;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof SyntaxError && 'body' in err) {
    // JSON解析错误
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Invalid JSON payload';
  } else if (err.name === 'ValidationError') {
    // 数据验证错误
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.errors || err.message;
  } else if (err.code === '23505') {
    // PostgreSQL唯一约束冲突
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = 'Resource already exists';
    details = err.detail;
  } else if (err.code === '23503') {
    // PostgreSQL外键约束冲突
    statusCode = 400;
    errorCode = 'FOREIGN_KEY_CONSTRAINT';
    message = 'Referenced resource does not exist';
    details = err.detail;
  } else if (err.message) {
    // 其他错误，使用错误消息
    message = err.message;
  }

  // 记录错误日志
  console.error(`[Error] ${requestId}:`, {
    code: errorCode,
    message,
    statusCode,
    details,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // 发送错误响应
  const response: ApiResponse = {
    success: false,
    data: null,
    error: {
      code: errorCode,
      message,
      details,
    },
    requestId,
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}

/**
 * 404处理中间件
 */
export function notFoundHandler(req: Request, res: Response) {
  const requestId = res.getHeader('X-Request-ID') as string || 'unknown';

  const response: ApiResponse = {
    success: false,
    data: null,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    requestId,
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
}