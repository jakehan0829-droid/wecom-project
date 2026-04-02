// 统一HTTP客户端封装
// 提供统一的错误处理、请求拦截、类型安全等功能

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ApiError extends Error {
  code?: string;
  status?: number;
  details?: any;
}

export interface RequestOptions extends RequestInit {
  // 是否抛出错误（默认为true）
  throwOnError?: boolean;
  // 重试次数（默认为0）
  retryCount?: number;
  // 重试延迟（毫秒，默认为1000）
  retryDelay?: number;
  // 超时时间（毫秒，默认为30000）
  timeout?: number;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private token?: string;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * 设置认证令牌
   */
  setToken(token: string) {
    this.token = token;
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
    return this;
  }

  /**
   * 设置基础URL
   */
  setBaseURL(baseURL: string) {
    this.baseURL = baseURL;
    return this;
  }

  /**
   * 统一的请求方法
   */
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      throwOnError = true,
      retryCount = 0,
      retryDelay = 1000,
      timeout = 30000,
      ...fetchOptions
    } = options;

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

    // 合并headers
    const headers = {
      ...this.defaultHeaders,
      ...fetchOptions.headers,
    };

    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        // 创建超时控制器
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 解析响应
        let data: ApiResponse<T>;
        try {
          data = await response.json();
        } catch (e) {
          // 非JSON响应
          const text = await response.text();
          throw this.createError({
            message: `Invalid JSON response: ${text}`,
            status: response.status,
            code: 'INVALID_JSON',
          });
        }

        // 检查HTTP状态码和业务成功标志
        if (!response.ok || !data.success) {
          const error = this.createError({
            message: data.error?.message || data.message || 'Request failed',
            status: response.status,
            code: data.error?.code || 'REQUEST_FAILED',
            details: data.error?.details,
          });

          if (throwOnError) {
            throw error;
          }

          return data.data; // 即使有错误也返回数据（如果throwOnError为false）
        }

        return data.data;

      } catch (error) {
        lastError = this.normalizeError(error);

        // 如果不是最后一次尝试，等待后重试
        if (attempt < retryCount) {
          await this.sleep(retryDelay);
          continue;
        }

        if (throwOnError) {
          throw lastError;
        }

        // 如果不需要抛出错误，返回null或抛出错误信息
        throw lastError;
      }
    }

    // 这里应该不会执行到，因为上面要么return要么throw
    throw lastError || this.createError({ message: 'Unknown error' });
  }

  /**
   * GET请求
   */
  async get<T = any>(endpoint: string, options: RequestOptions = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST请求
   */
  async post<T = any>(endpoint: string, data?: any, options: RequestOptions = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(endpoint: string, data?: any, options: RequestOptions = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT请求
   */
  async put<T = any>(endpoint: string, data?: any, options: RequestOptions = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(endpoint: string, options: RequestOptions = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * 创建标准化的错误对象
   */
  private createError(errorInfo: {
    message: string;
    status?: number;
    code?: string;
    details?: any;
  }): ApiError {
    const error = new Error(errorInfo.message) as ApiError;
    error.code = errorInfo.code;
    error.status = errorInfo.status;
    error.details = errorInfo.details;
    error.name = 'ApiError';
    return error;
  }

  /**
   * 标准化错误对象
   */
  private normalizeError(error: any): ApiError {
    if (error instanceof Error && 'code' in error && 'name' in error) {
      return error as ApiError;
    }

    if (error.name === 'AbortError') {
      return this.createError({
        message: 'Request timeout',
        code: 'TIMEOUT',
        status: 408,
      });
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return this.createError({
        message: 'Network error - please check your connection',
        code: 'NETWORK_ERROR',
        status: 0,
      });
    }

    return this.createError({
      message: error?.message || 'Unknown error',
      code: 'UNKNOWN_ERROR',
    });
  }

  /**
   * 等待指定时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建默认实例
const apiClient = new ApiClient();

// 导出默认实例和类
export default apiClient;
export { ApiClient };