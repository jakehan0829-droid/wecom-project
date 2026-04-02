import { Request, Response, NextFunction } from 'express';
import { getMonitor, recordApiResponseTime, captureError } from './error-monitor.service.js';

/**
 * 请求监控中间件
 * 跟踪API请求性能、错误和用户活动
 */
export function monitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const transaction = getMonitor().startTransaction(req.path, req.method);

  // 添加请求信息到transaction
  transaction.setTag('http.method', req.method);
  transaction.setTag('http.url', req.path);
  transaction.setTag('http.user_agent', req.get('user-agent') || 'unknown');

  // 添加请求ID（如果存在）
  const requestId = req.headers['x-request-id'] as string;
  if (requestId) {
    transaction.setTag('request_id', requestId);
  }

  // 添加用户信息（如果已认证）
  if (req.user && (req.user as any).id) {
    const user = req.user as any;
    getMonitor().setUser(user.id, user.email, user.name);
    transaction.setTag('user.id', user.id);
  }

  // 监控响应完成
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;

    // 记录API响应时间指标
    recordApiResponseTime(req.path, req.method, durationMs, res.statusCode);

    // 添加响应信息到transaction
    transaction.setTag('http.status_code', res.statusCode.toString());
    transaction.setData('response.duration_ms', durationMs);
    transaction.setData('response.content_length', res.get('content-length') || '0');

    // 标记错误响应
    if (res.statusCode >= 400) {
      transaction.setTag('error', 'true');
      transaction.setTag('error.type', 'http_error');
    }

    transaction.finish();
  });

  // 错误处理
  const originalSend = res.send;
  res.send = function(body?: any): Response {
    // 捕获错误响应
    if (res.statusCode >= 500 && body) {
      try {
        const errorBody = typeof body === 'string' ? JSON.parse(body) : body;
        if (errorBody.error || errorBody.message) {
          const error = new Error(errorBody.message || 'Server error');
          captureError(error, {
            requestId,
            userId: (req.user as any)?.id,
            tags: {
              endpoint: req.path,
              method: req.method,
              status_code: res.statusCode.toString()
            }
          });
        }
      } catch {
        // 忽略解析错误
      }
    }

    return originalSend.call(this, body);
  };

  next();
}

/**
 * 错误处理中间件（与监控集成）
 */
export function errorMonitoringMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 捕获错误到监控系统
  captureError(error, {
    userId: (req.user as any)?.id,
    requestId: req.headers['x-request-id'] as string,
    tags: {
      endpoint: req.path,
      method: req.method,
      error_type: error.name
    },
    extra: {
      stack: error.stack,
      body: req.body,
      query: req.query,
      params: req.params
    }
  });

  next(error);
}

/**
 * 性能监控中间件（可选）
 * 监控慢请求并报警
 */
export function performanceMonitoringMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();
  const slowRequestThreshold = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '5000', 10);

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;

    // 记录慢请求
    if (durationMs > slowRequestThreshold) {
      getMonitor().captureMessage(
        `Slow request detected: ${req.method} ${req.path} took ${durationMs}ms`,
        'warning',
        {
          userId: (req.user as any)?.id,
          tags: {
            endpoint: req.path,
            method: req.method,
            duration_ms: durationMs.toString(),
            threshold_ms: slowRequestThreshold.toString()
          }
        }
      );
    }
  });

  next();
}

/**
 * 数据库查询监控中间件（如果使用ORM）
 */
export function createDbMonitoringMiddleware(dbClient: any) {
  return function dbMonitoringMiddleware(req: Request, res: Response, next: NextFunction) {
    const originalQuery = dbClient.query;

    dbClient.query = function(sql: string, params?: any[]) {
      const startTime = Date.now();

      return originalQuery.call(this, sql, params)
        .then((result: any) => {
          const durationMs = Date.now() - startTime;
          const slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10);

          // 记录查询指标
          recordDbQueryTime(sql, durationMs, true);

          // 记录慢查询
          if (durationMs > slowQueryThreshold) {
            getMonitor().captureMessage(
              `Slow query detected: ${sql.substring(0, 100)}... took ${durationMs}ms`,
              'warning',
              {
                tags: {
                  query_type: sql.split(' ')[0].toUpperCase(),
                  duration_ms: durationMs.toString(),
                  threshold_ms: slowQueryThreshold.toString()
                }
              }
            );
          }

          return result;
        })
        .catch((error: Error) => {
          const durationMs = Date.now() - startTime;

          // 记录失败的查询
          recordDbQueryTime(sql, durationMs, false);

          // 捕获数据库错误
          captureError(error, {
            tags: {
              query_type: sql.split(' ')[0].toUpperCase(),
              error_type: 'database_error'
            },
            extra: {
              sql: sql.substring(0, 500), // 限制长度
              params: params ? JSON.stringify(params) : 'none'
            }
          });

          throw error;
        });
    };

    next();
  };
}