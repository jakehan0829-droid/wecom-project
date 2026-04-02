import { test, expect } from '@playwright/test';

test.describe('企业微信消息处理流程', () => {
  test.beforeEach(async ({ page }) => {
    // 访问应用首页
    await page.goto('/');
    // 等待应用加载完成
    await page.waitForLoadState('networkidle');
  });

  test('医生工作台可以查看患者对话', async ({ page }) => {
    // 导航到医生工作台
    const workbenchNav = page.locator('button, a').filter({ hasText: /医生工作台|Workbench/ });
    if (await workbenchNav.isVisible()) {
      await workbenchNav.click();
    }

    // 等待工作台加载
    await expect(page.locator('text=/患者列表|Patients/').first()).toBeVisible();

    // 检查是否有患者显示
    const patientList = page.locator('[data-testid="patient-list"], .patient-item');
    await expect(patientList.first()).toBeVisible({ timeout: 10000 });

    // 点击患者查看对话
    const firstPatient = patientList.first();
    await firstPatient.click();

    // 检查对话详情区域
    await expect(page.locator('[data-testid="conversation-details"], .conversation-panel')).toBeVisible();
  });

  test('可以发送消息到患者', async ({ page }) => {
    // 导航到医生工作台
    const workbenchNav = page.locator('button, a').filter({ hasText: /医生工作台|Workbench/ });
    if (await workbenchNav.isVisible()) {
      await workbenchNav.click();
    }

    // 等待工作台加载
    await expect(page.locator('text=/患者列表|Patients/').first()).toBeVisible();

    // 选择患者
    const patientList = page.locator('[data-testid="patient-list"], .patient-item');
    await patientList.first().click();

    // 找到消息输入框
    const messageInput = page.locator('[data-testid="message-input"], textarea, input[type="text"]').first();
    await expect(messageInput).toBeVisible();

    // 输入测试消息
    const testMessage = '这是测试消息，请按时服药。';
    await messageInput.fill(testMessage);

    // 点击发送按钮
    const sendButton = page.locator('button').filter({ hasText: /发送|Send/ }).first();
    await sendButton.click();

    // 验证消息发送成功（可能需要检查UI反馈）
    await expect(page.locator(`text="${testMessage}"`).first()).toBeVisible({ timeout: 5000 });
  });

  test('可以查看AI分析建议', async ({ page }) => {
    // 导航到医生工作台
    const workbenchNav = page.locator('button, a').filter({ hasText: /医生工作台|Workbench/ });
    if (await workbenchNav.isVisible()) {
      await workbenchNav.click();
    }

    // 等待工作台加载
    await expect(page.locator('text=/患者列表|Patients/').first()).toBeVisible();

    // 选择患者
    const patientList = page.locator('[data-testid="patient-list"], .patient-item');
    await patientList.first().click();

    // 查找AI分析建议区域
    const aiSuggestions = page.locator('[data-testid="ai-suggestions"], .ai-analysis, text=/AI建议|AI Suggestions/');

    if (await aiSuggestions.isVisible()) {
      // 如果存在AI建议区域，验证其内容
      await expect(aiSuggestions).toBeVisible();
    } else {
      // 或者检查是否有消息被AI分析
      const analyzedMessage = page.locator('[data-testid="ai-analyzed"], .message-analyzed');
      await expect(analyzedMessage.first()).toBeVisible({ timeout: 5000 });
    }
  });
});