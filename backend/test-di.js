import 'reflect-metadata';
import { container } from './src/shared/di/container.js';
import { PatientService } from './src/modules/patient/service/patient.service.new.js';

async function test() {
  try {
    console.log('Testing dependency injection...');

    // 解析PatientService
    const patientService = container.resolve(PatientService);
    console.log('✓ PatientService resolved successfully');

    // 测试方法
    const patients = await patientService.listPatients();
    console.log('✓ PatientService.listPatients() successful');
    console.log(`  Found ${patients.total} patients`);

    console.log('✓ All tests passed!');
  } catch (error) {
    console.error('✗ Test failed:', error);
    console.error(error.stack);
  }
}

test();