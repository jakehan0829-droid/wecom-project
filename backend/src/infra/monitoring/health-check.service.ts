import { db } from '../db/pg.js';

// Redis客户端可能不存在，延迟导入
let redisClient: any = null;

async function getRedisClient() {
  if (redisClient === null) {
    try {
      // 尝试动态导入Redis客户端
      // @ts-ignore
      const redisModule = await import('../cache/redis.js');
      redisClient = redisModule.redisClient;
    } catch {
      // Redis未配置
      redisClient = false; // 标记为不可用
    }
  }
  return redisClient;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: {
    api: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
    };
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
  };
  metrics: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    loadAverage: number[];
  };
  version: string;
}

/**
 * 执行完整的健康检查
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const checkPromises = [
    checkApiHealth(),
    checkDatabaseHealth(),
    checkRedisHealth()
  ];

  const [apiHealth, dbHealth, redisHealth] = await Promise.allSettled(checkPromises);

  const apiResult = apiHealth.status === 'fulfilled' ? apiHealth.value : { status: 'unhealthy' as const, responseTime: 0 };
  const dbResult = dbHealth.status === 'fulfilled' ? dbHealth.value : { status: 'unhealthy' as const, responseTime: 0, error: dbHealth.reason?.message };
  const redisResult = redisHealth.status === 'fulfilled' ? redisHealth.value : { status: 'unhealthy' as const, responseTime: 0, error: redisHealth.reason?.message };

  // 确定总体状态
  const unhealthyServices = [apiResult, dbResult, redisResult].filter(s => s.status === 'unhealthy').length;
  let overallStatus: HealthCheckResult['status'] = 'healthy';
  if (unhealthyServices > 1) {
    overallStatus = 'unhealthy';
  } else if (unhealthyServices === 1) {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      api: apiResult,
      database: dbResult,
      redis: redisResult
    },
    metrics: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      loadAverage: process.cpuUsage ? [process.cpuUsage().user, process.cpuUsage().system] : [0, 0]
    },
    version: process.env.npm_package_version || '1.0.0'
  };
}

/**
 * 检查API服务健康状态
 */
async function checkApiHealth(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number }> {
  const start = Date.now();
  try {
    // 简单的自检，确保API能响应
    const elapsed = Date.now() - start;
    return {
      status: 'healthy',
      responseTime: elapsed
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start
    };
  }
}

/**
 * 检查数据库连接健康状态
 */
async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number; error?: string }> {
  const start = Date.now();
  try {
    // 执行简单的查询验证数据库连接
    const result = await db.query('SELECT 1 as health_check');
    const elapsed = Date.now() - start;

    if (result.rows[0]?.health_check === 1) {
      return {
        status: 'healthy',
        responseTime: elapsed
      };
    } else {
      return {
        status: 'unhealthy',
        responseTime: elapsed,
        error: 'Database query returned unexpected result'
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

/**
 * 检查Redis连接健康状态
 */
async function checkRedisHealth(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number; error?: string }> {
  const start = Date.now();
  try {
    const client = await getRedisClient();

    // 如果Redis客户端可用，执行PING命令
    if (client) {
      // @ts-ignore - Redis客户端方法可能不同
      const pong = await client.ping();
      const elapsed = Date.now() - start;

      if (pong === 'PONG') {
        return {
          status: 'healthy',
          responseTime: elapsed
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime: elapsed,
          error: 'Redis PING returned unexpected response'
        };
      }
    } else {
      // Redis未配置，视为健康（可选）
      return {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown Redis error'
    };
  }
}

/**
 * 简化的健康检查（用于负载均衡器）
 */
export async function simpleHealthCheck(): Promise<{ status: 'ok' | 'error'; timestamp: string }> {
  try {
    // 只检查最关键的服务（数据库）
    const dbCheck = await checkDatabaseHealth();

    if (dbCheck.status === 'healthy') {
      return {
        status: 'ok',
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        status: 'error',
        timestamp: new Date().toISOString()
      };
    }
  } catch {
    return {
      status: 'error',
      timestamp: new Date().toISOString()
    };
  }
}