import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// 创建MSW服务器实例
// 注意：在Node环境中使用setupServer，在浏览器环境中使用setupWorker
export const server = setupServer(...handlers);