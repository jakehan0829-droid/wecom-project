import '@testing-library/jest-dom';

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 对于Jest测试环境，我们使用简化的MSW配置
// 实际请求拦截由Jest的module mocking处理