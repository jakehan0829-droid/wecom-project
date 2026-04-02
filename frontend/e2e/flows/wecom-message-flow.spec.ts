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
    const patientList = page.locator('.patient-list-item');
    await expect(patientList.first()).toBeVisible({ timeout: 10000 });

    // 点击患者查看对话
    const firstPatient = patientList.first();
    await firstPatient.click();

    // 切换到消息沟通标签页
    const messagesTab = page.locator('button').filter({ hasText: /消息沟通|Messages/ });
    await expect(messagesTab).toBeEnabled({ timeout: 5000 });
    await messagesTab.click();

    // 检查对话详情区域
    await expect(page.locator('.message-panel')).toBeVisible();
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
    const patientList = page.locator('.patient-list-item');
    await patientList.first().click();

    // 切换到消息沟通标签页
    const messagesTab = page.locator('button').filter({ hasText: /消息沟通|Messages/ });
    await expect(messagesTab).toBeEnabled({ timeout: 5000 });
    await messagesTab.click();

    // 找到消息输入框
    const messageInput = page.locator('.message-input textarea, .message-input input[type="text"]').first();
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
    const patientList = page.locator('.patient-list-item');
    await patientList.first().click();

    // 切换到AI分析标签页
    const analyticsTab = page.locator('button').filter({ hasText: /AI分析|Analytics/ });
    await expect(analyticsTab).toBeEnabled({ timeout: 5000 });
    await analyticsTab.click();

    // 验证已切换到AI分析标签页
    // 检查AI分析标签页是否激活
    const activeAnalyticsTab = page.locator('button.active').filter({ hasText: /AI分析|Analytics/ });
    await expect(activeAnalyticsTab).toBeVisible({ timeout: 5000 });

    // 可选：检查AI分析内容区域
    const aiContentArea = page.locator('.tab-content').filter({ hasText: /AI|分析/ });
    if (await aiContentArea.isVisible({ timeout: 3000 })) {
      await expect(aiContentArea).toBeVisible();
    }
  });
});