import { Request, Response } from 'express';
import { performHealthCheck, simpleHealthCheck } from './health-check.service.js';

/**
 * 完整的健康检查端点
 * 返回所有服务的详细状态
 */
export async function healthCheck(req: Request, res: Response) {
  try {
    const health = await performHealthCheck();

    // 根据状态设置HTTP状态码
    let statusCode = 200;
    if (health.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    } else if (health.status === 'degraded') {
      statusCode = 206; // Partial Content
    }

    res.status(statusCode).json({
      ...health,
      message: getStatusMessage(health.status)
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      message: 'Health check execution failed',
      error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    });
  }
}

/**
 * 简化的健康检查端点
 * 用于负载均衡器、Kubernetes探针等
 */
export async function livenessProbe(req: Request, res: Response) {
  try {
    const health = await simpleHealthCheck();

    if (health.status === 'ok') {
      res.status(200).json(health);
    } else {
      res.status(503).json(health);
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Liveness probe failed'
    });
  }
}

/**
 * 就绪检查端点
 * 检查应用是否准备好接收流量
 */
export async function readinessProbe(req: Request, res: Response) {
  try {
    // 就绪检查通常比存活检查更严格
    // 这里我们检查数据库连接
    const health = await simpleHealthCheck();

    if (health.status === 'ok') {
      res.status(200).json({
        ...health,
        ready: true,
        services: ['database']
      });
    } else {
      res.status(503).json({
        ...health,
        ready: false,
        services: ['database']
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      ready: false,
      message: 'Readiness probe failed'
    });
  }
}

/**
 * 指标端点（简单的应用指标）
 */
export async function metrics(req: Request, res: Response) {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        pid: process.pid,
        version: process.version,
        platform: process.platform
      },
      system: {
        arch: process.arch,
        cpus: require('os').cpus().length,
        totalMemory: require('os').totalmem(),
        freeMemory: require('os').freemem(),
        loadAverage: require('os').loadavg()
      },
      http: {
        // 可以添加HTTP请求统计
        activeConnections: 0 // 需要中间件来跟踪
      }
    };

    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: 'Failed to collect metrics'
    });
  }
}

/**
 * 根据状态获取友好消息
 */
function getStatusMessage(status: 'healthy' | 'unhealthy' | 'degraded'): string {
  switch (status) {
    case 'healthy':
      return 'All services are operating normally';
    case 'degraded':
      return 'Some services are experiencing issues, but the application is still functional';
    case 'unhealthy':
      return 'Critical services are unavailable';
    default:
      return 'Unknown status';
  }
}