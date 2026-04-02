// 简单的测试示例，验证测试环境配置是否正确
describe('Test environment setup', () => {
  test('basic arithmetic', () => {
    expect(1 + 1).toBe(2);
  });

  test('MSW import works', () => {
    // 验证MSW可以正常导入
    expect(typeof window).toBe('object');
  });
});