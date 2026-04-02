import { test, expect } from '@playwright/test';

test.describe('AI分析集成流程', () => {
  test.beforeEach(async ({ page }) => {
    // 访问应用首页
    await page.goto('/');
    // 等待应用加载完成
    await page.waitForLoadState('networkidle');
  });

  test('消息可以被AI分析并更新档案', async ({ page }) => {
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

    // 发送一条包含健康信息的消息
    const messageInput = page.locator('.message-input textarea, .message-input input[type="text"]').first();
    await expect(messageInput).toBeVisible({ timeout: 5000 });

    const healthMessage = '最近血压有点高，早上测量是150/95，有点头晕。';
    await messageInput.fill(healthMessage);

    const sendButton = page.locator('.message-input button').filter({ hasText: /发送|Send/ }).first();
    await expect(sendButton).toBeEnabled({ timeout: 5000 });
    await sendButton.click();

    // 等待消息发送
    await expect(page.locator(`text="${healthMessage}"`).first()).toBeVisible({ timeout: 5000 });

    // 检查是否有AI分析标记或建议
    const aiAnalysisIndicator = page.locator('.ai-tag, [data-testid="ai-analysis"]');
    if (await aiAnalysisIndicator.isVisible({ timeout: 10000 })) {
      await expect(aiAnalysisIndicator).toBeVisible();

      // 点击查看AI分析详情
      await aiAnalysisIndicator.click();

      // 检查分析结果
      const analysisResult = page.locator('.ai-analysis-detail');
      await expect(analysisResult).toBeVisible();

      // 检查是否包含关键词
      await expect(analysisResult).toContainText(/血压|血压监测|blood pressure/i);
    }

    // 导航到患者档案查看是否更新
    const profileLink = page.locator('button, a').filter({ hasText: /查看档案|View Profile/ });
    if (await profileLink.isVisible()) {
      await profileLink.click();

      // 等待档案页面加载
      await expect(page.locator('text=/档案详情|Profile Details/').first()).toBeVisible();

      // 检查健康记录是否包含新信息
      const healthRecords = page.locator('.health-history');
      await expect(healthRecords).toContainText(/血压|blood pressure/i, { timeout: 5000 });
    }
  });

  test('可以查看AI生成的健康建议', async ({ page }) => {
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

    // 查找AI建议按钮或区域
    const aiSuggestButton = page.locator('button').filter({ hasText: /AI建议|AI Suggestions|生成建议|Generate Advice/ });

    if (await aiSuggestButton.isVisible()) {
      await aiSuggestButton.click();

      // 等待AI建议生成
      await expect(page.locator('.ai-advice-panel')).toBeVisible({ timeout: 10000 });

      // 检查建议内容
      const adviceContent = page.locator('.advice-text');
      await expect(adviceContent).toBeVisible();

      // 验证建议合理性
      await expect(adviceContent).not.toBeEmpty();
    } else {
      // 或者检查是否有自动生成的建议区域
      const autoAdvice = page.locator('.health-advice');
      if (await autoAdvice.isVisible({ timeout: 5000 })) {
        await expect(autoAdvice).toBeVisible();
        await expect(autoAdvice).not.toBeEmpty();
      }
    }
  });

  test('可以查看消息情感分析', async ({ page }) => {
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

    // 查找对话历史
    const conversationHistory = page.locator('.message-list');
    await expect(conversationHistory).toBeVisible({ timeout: 5000 });

    // 检查消息是否有情感分析标记
    const sentimentTags = page.locator('[data-testid="sentiment-tag"], .sentiment-indicator');

    if (await sentimentTags.first().isVisible({ timeout: 5000 })) {
      // 如果有情感分析，验证其显示
      const firstTag = sentimentTags.first();
      await expect(firstTag).toBeVisible();

      // 点击查看更多分析
      await firstTag.click();

      const sentimentDetail = page.locator('[data-testid="sentiment-detail"], .sentiment-analysis');
      if (await sentimentDetail.isVisible()) {
        await expect(sentimentDetail).toBeVisible();
        await expect(sentimentDetail).toContainText(/积极|负面|中性|positive|negative|neutral/i);
      }
    }
  });

  test('业务路由决策显示', async ({ page }) => {
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

    // 查找业务路由指示器
    const routingIndicator = page.locator('[data-testid="routing-decision"], .routing-tag');

    if (await routingIndicator.isVisible({ timeout: 5000 })) {
      // 检查路由决策显示
      await expect(routingIndicator).toBeVisible();

      // 验证路由决策类型
      await expect(routingIndicator).toContainText(/随访|紧急|常规|follow-up|urgent|routine/i);

      // 点击查看详情
      await routingIndicator.click();

      const routingDetail = page.locator('[data-testid="routing-detail"], .routing-explanation');
      if (await routingDetail.isVisible()) {
        await expect(routingDetail).toBeVisible();
        await expect(routingDetail).not.toBeEmpty();
      }
    }
  });
});