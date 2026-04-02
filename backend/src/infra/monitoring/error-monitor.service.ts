/**
 * 错误监控服务抽象层
 * 支持Sentry、Datadog、NewRelic等APM工具
 */

export interface ErrorContext {
  userId?: string;
  patientId?: string;
  conversationId?: string;
  requestId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'count' | 'percentage';
  tags?: Record<string, string>;
  timestamp?: Date;
}

export interface MonitoringClient {
  captureError(error: Error, context?: ErrorContext): void;
  captureMessage(message: string, level: 'info' | 'warning' | 'error', context?: ErrorContext): void;
  startTransaction(name: string, operation?: string): Transaction;
  recordMetric(metric: PerformanceMetric): void;
  setUser(userId: string, email?: string, name?: string): void;
}

export interface Transaction {
  setTag(key: string, value: string): void;
  setData(key: string, value: any): void;
  finish(): void;
}

// 默认的监控客户端（无操作）
class NoopMonitoringClient implements MonitoringClient {
  captureError(error: Error, context?: ErrorContext): void {
    console.error('Error captured (no monitoring):', error.message, context);
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error', context?: ErrorContext): void {
    console.log(`${level.toUpperCase()}: ${message}`, context);
  }

  startTransaction(name: string, operation?: string): Transaction {
    console.log(`Transaction started: ${name}${operation ? ` (${operation})` : ''}`);
    return {
      setTag: () => {},
      setData: () => {},
      finish: () => {}
    };
  }

  recordMetric(metric: PerformanceMetric): void {
    console.log(`Metric recorded: ${metric.name}=${metric.value}${metric.unit}`);
  }

  setUser(userId: string, email?: string, name?: string): void {
    console.log(`User set: ${userId}${email ? ` (${email})` : ''}${name ? ` - ${name}` : ''}`);
  }
}

// Sentry客户端实现
class SentryMonitoringClient implements MonitoringClient {
  private sentry: any;

  constructor(dsn: string, environment: string) {
    try {
      // 动态导入Sentry，避免未安装时出错
      const Sentry = require('@sentry/node');

      Sentry.init({
        dsn,
        environment,
        tracesSampleRate: 0.1, // 采样率
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: require('express') })
        ]
      });

      this.sentry = Sentry;
    } catch (error) {
      console.warn('Sentry not available, falling back to noop:', error.message);
      return new NoopMonitoringClient() as any;
    }
  }

  captureError(error: Error, context?: ErrorContext): void {
    if (this.sentry) {
      this.sentry.withScope((scope: any) => {
        if (context) {
          this.addContextToScope(scope, context);
        }
        this.sentry.captureException(error);
      });
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error', context?: ErrorContext): void {
    if (this.sentry) {
      this.sentry.withScope((scope: any) => {
        if (context) {
          this.addContextToScope(scope, context);
        }
        this.sentry.captureMessage(message, this.mapLevel(level));
      });
    }
  }

  startTransaction(name: string, operation?: string): Transaction {
    if (this.sentry) {
      const transaction = this.sentry.startTransaction({
        name,
        op: operation
      });

      return {
        setTag: (key: string, value: string) => transaction.setTag(key, value),
        setData: (key: string, value: any) => transaction.setData(key, value),
        finish: () => transaction.finish()
      };
    }

    return new NoopMonitoringClient().startTransaction(name, operation);
  }

  recordMetric(metric: PerformanceMetric): void {
    // Sentry的指标记录可能需要其他集成
    console.log(`Metric recorded to Sentry: ${metric.name}=${metric.value}${metric.unit}`);
  }

  setUser(userId: string, email?: string, name?: string): void {
    if (this.sentry) {
      this.sentry.setUser({
        id: userId,
        email,
        username: name
      });
    }
  }

  private addContextToScope(scope: any, context: ErrorContext): void {
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
  }

  private mapLevel(level: 'info' | 'warning' | 'error'): string {
    switch (level) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  }
}

// 监控服务单例
let monitoringClient: MonitoringClient | null = null;

/**
 * 初始化监控客户端
 */
export function initMonitoring(): MonitoringClient {
  if (monitoringClient) {
    return monitoringClient;
  }

  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';

  if (dsn) {
    console.log('Initializing Sentry monitoring');
    monitoringClient = new SentryMonitoringClient(dsn, environment);
  } else {
    console.log('No monitoring DSN provided, using noop monitoring');
    monitoringClient = new NoopMonitoringClient();
  }

  return monitoringClient;
}

/**
 * 获取监控客户端实例
 */
export function getMonitor(): MonitoringClient {
  if (!monitoringClient) {
    return initMonitoring();
  }
  return monitoringClient;
}

/**
 * 便捷方法：捕获错误
 */
export function captureError(error: Error, context?: ErrorContext): void {
  getMonitor().captureError(error, context);
}

/**
 * 便捷方法：捕获消息
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
  getMonitor().captureMessage(message, level, context);
}

/**
 * 便捷方法：记录API响应时间指标
 */
export function recordApiResponseTime(endpoint: string, method: string, durationMs: number, statusCode: number): void {
  getMonitor().recordMetric({
    name: 'api.response_time',
    value: durationMs,
    unit: 'ms',
    tags: {
      endpoint,
      method,
      status_code: statusCode.toString()
    },
    timestamp: new Date()
  });
}

/**
 * 便捷方法：记录数据库查询指标
 */
export function recordDbQueryTime(query: string, durationMs: number, success: boolean): void {
  // 简化的查询名称（避免参数泄露）
  const queryName = query.split(' ')[0].toUpperCase(); // SELECT, INSERT, UPDATE等

  getMonitor().recordMetric({
    name: 'db.query_time',
    value: durationMs,
    unit: 'ms',
    tags: {
      query_type: queryName,
      success: success.toString()
    },
    timestamp: new Date()
  });
}