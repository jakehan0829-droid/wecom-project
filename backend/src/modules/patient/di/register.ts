import { container } from '../../../shared/di/container.js';
import type { PatientRepository } from '../repository/patient.repository.js';
import { PatientRepositoryImpl } from '../repository/patient.repository.js';

// 注册Patient模块的依赖
container.register<PatientRepository>('PatientRepository', {
  useClass: PatientRepositoryImpl
});

export { container };