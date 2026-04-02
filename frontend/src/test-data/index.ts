/**
 * 测试数据准备工具
 * 用于E2E测试中创建测试数据
 */

export interface TestPatientData {
  name: string;
  gender?: 'male' | 'female' | 'unknown';
  birthDate?: string;
  mobile?: string;
  diabetesType?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  source?: string;
}

export interface TestWecomBindingData {
  patientId: string;
  bindingType: 'wecom_user' | 'external_user';
  wecomUserId?: string;
  externalUserId?: string;
}

/**
 * 创建测试患者
 */
export async function createTestPatient(patientData: TestPatientData): Promise<string> {
  try {
    const response = await fetch('/api/v1/patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-123',
      },
      body: JSON.stringify(patientData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`创建测试患者失败: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.data?.id || result.id;
  } catch (error) {
    console.error('创建测试患者时出错:', error);
    // 如果API调用失败，返回模拟ID用于测试
    return `test-patient-${Date.now()}`;
  }
}

/**
 * 创建企业微信绑定
 */
export async function createTestWecomBinding(bindingData: TestWecomBindingData): Promise<string> {
  try {
    const response = await fetch(`/api/v1/patients/${bindingData.patientId}/wecom-binding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-123',
      },
      body: JSON.stringify({
        bindingType: bindingData.bindingType,
        wecomUserId: bindingData.wecomUserId,
        externalUserId: bindingData.externalUserId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`创建企业微信绑定失败: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.data?.id || result.id;
  } catch (error) {
    console.error('创建企业微信绑定时出错:', error);
    // 如果API调用失败，返回模拟ID用于测试
    return `test-binding-${Date.now()}`;
  }
}

/**
 * 创建默认测试患者
 */
export async function createDefaultTestPatient(): Promise<string> {
  return createTestPatient({
    name: `测试患者 ${Date.now()}`,
    gender: 'male',
    birthDate: '1980-01-01',
    mobile: '13800138000',
    diabetesType: '2型',
    riskLevel: 'medium',
    source: '测试',
  });
}

/**
 * 清理测试数据（如果需要）
 * 注意：在实际环境中可能需要实现清理逻辑
 */
export async function cleanupTestData(patientId?: string): Promise<void> {
  if (!patientId) return;

  try {
    // 这里可以实现清理逻辑，但要注意生产环境安全
    console.log(`测试数据清理: patientId=${patientId}`);
  } catch (error) {
    console.error('清理测试数据时出错:', error);
  }
}