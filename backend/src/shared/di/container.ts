import 'reflect-metadata';
import { container } from 'tsyringe';

// 导入各模块的依赖注册
import '../../modules/patient/di/register.js';

// 这里可以添加全局依赖注册

export { container };