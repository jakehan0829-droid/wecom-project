import '@testing-library/jest-dom';

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 在单元测试中使用模拟server，避免msw依赖问题
import { server } from './mocks/testHandlers';

// 在所有测试之前启动MSW服务器
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// 在每个测试后重置处理程序
afterEach(() => server.resetHandlers());

// 在所有测试之后关闭MSW服务器
afterAll(() => server.close());

// 设置全局测试超时
jest.setTimeout(10000);