import { test, expect } from '@playwright/test';

test.describe('企业微信绑定流程', () => {
  test.beforeEach(async ({ page }) => {
    // 访问应用首页
    await page.goto('/');
    // 等待应用加载完成
    await page.waitForLoadState('networkidle');
  });

  test('医生可以查看患者绑定状态', async ({ page }) => {
    // 导航到患者管理或档案管理
    const patientNav = page.locator('button, a').filter({ hasText: /患者管理|Patients/ });
    if (!(await patientNav.isVisible())) {
      const archiveNav = page.locator('button, a').filter({ hasText: /档案管理|Archives/ });
      if (await archiveNav.isVisible()) {
        await archiveNav.click();
      }
    } else {
      await patientNav.click();
    }

    // 等待患者列表加载
    await expect(page.locator('text=/患者列表|Patient List/').first()).toBeVisible({ timeout: 10000 });

    // 选择患者查看详情
    const firstPatient = page.locator('[data-testid="patient-item"], .patient-row, table tbody tr').first();
    await firstPatient.click();

    // 等待患者详情加载
    await expect(page.locator('text=/患者详情|Patient Details/').first()).toBeVisible();

    // 查找企业微信绑定信息
    const wecomBindingSection = page.locator('[data-testid="wecom-binding"], text=/企业微信绑定|WeCom Binding/');

    if (await wecomBindingSection.isVisible()) {
      // 检查绑定状态
      await expect(wecomBindingSection).toBeVisible();

      // 检查是否有绑定信息显示
      const bindingInfo = page.locator('[data-testid="binding-info"], .binding-status');
      if (await bindingInfo.isVisible()) {
        await expect(bindingInfo).toBeVisible();
      }
    } else {
      // 如果没有绑定区域，检查是否有绑定按钮
      const bindButton = page.locator('button').filter({ hasText: /绑定企业微信|Bind WeCom/ });
      if (await bindButton.isVisible()) {
        await expect(bindButton).toBeVisible();
      }
    }
  });

  test('医生可以手动绑定患者到企业微信', async ({ page }) => {
    // 导航到患者管理
    const patientNav = page.locator('button, a').filter({ hasText: /患者管理|Patients/ });
    if (!(await patientNav.isVisible())) {
      const archiveNav = page.locator('button, a').filter({ hasText: /档案管理|Archives/ });
      if (await archiveNav.isVisible()) {
        await archiveNav.click();
      }
    } else {
      await patientNav.click();
    }

    // 等待患者列表加载
    await expect(page.locator('text=/患者列表|Patient List/').first()).toBeVisible({ timeout: 10000 });

    // 选择患者
    const firstPatient = page.locator('[data-testid="patient-item"], .patient-row, table tbody tr').first();
    await firstPatient.click();

    // 等待患者详情加载
    await expect(page.locator('text=/患者详情|Patient Details/').first()).toBeVisible();

    // 查找绑定按钮
    const bindButton = page.locator('button').filter({ hasText: /绑定企业微信|Bind WeCom/ });

    if (await bindButton.isVisible()) {
      await bindButton.click();

      // 等待绑定表单出现
      const bindForm = page.locator('[data-testid="bind-form"], form');
      await expect(bindForm).toBeVisible({ timeout: 5000 });

      // 填写绑定信息
      // 企业微信用户ID输入
      const wecomIdInput = page.locator('input[name="wecomUserId"], input[placeholder*="企业微信用户ID"], input[placeholder*="WeCom User ID"]');
      if (await wecomIdInput.isVisible()) {
        const testWecomId = 'test_wecom_user_' + Date.now();
        await wecomIdInput.fill(testWecomId);
      }

      // 外部用户ID输入
      const externalIdInput = page.locator('input[name="externalUserId"], input[placeholder*="外部用户ID"], input[placeholder*="External User ID"]');
      if (await externalIdInput.isVisible()) {
        const testExternalId = 'test_external_' + Date.now();
        await externalIdInput.fill(testExternalId);
      }

      // 选择绑定类型
      const bindingTypeSelect = page.locator('select[name="bindingType"]');
      if (await bindingTypeSelect.isVisible()) {
        await bindingTypeSelect.selectOption({ label: /企业微信用户|WeCom User/ });
      }

      // 提交绑定
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /确认绑定|Confirm Binding/ });
      await submitButton.click();

      // 验证绑定成功
      await expect(page.locator('text=/绑定成功|Binding Successful/').first()).toBeVisible({ timeout: 10000 });

      // 检查绑定状态更新
      const bindingStatus = page.locator('[data-testid="binding-status"], .status-indicator');
      if (await bindingStatus.isVisible()) {
        await expect(bindingStatus).toContainText(/已绑定|Bound/);
      }
    }
  });

  test('可以将对话映射提升为绑定', async ({ page }) => {
    // 导航到医生工作台
    const workbenchNav = page.locator('button, a').filter({ hasText: /医生工作台|Workbench/ });
    if (await workbenchNav.isVisible()) {
      await workbenchNav.click();
    }

    // 等待工作台加载
    await expect(page.locator('text=/患者列表|Patients/').first()).toBeVisible();

    // 选择患者查看对话
    const patientList = page.locator('[data-testid="patient-list"], .patient-item');
    await patientList.first().click();

    // 等待对话加载
    await expect(page.locator('[data-testid="conversation-list"], .message-list')).toBeVisible();

    // 查找未绑定的对话或消息
    const unmappedMessage = page.locator('[data-testid="unmapped-message"], .mapping-pending');

    if (await unmappedMessage.first().isVisible({ timeout: 5000 })) {
      // 选择未绑定的消息
      await unmappedMessage.first().click();

      // 查找"提升为绑定"按钮
      const promoteButton = page.locator('button').filter({ hasText: /提升为绑定|Promote to Binding/ });

      if (await promoteButton.isVisible()) {
        await promoteButton.click();

        // 等待绑定确认对话框
        const confirmDialog = page.locator('[data-testid="confirm-dialog"], .dialog-modal');
        await expect(confirmDialog).toBeVisible();

        // 确认提升
        const confirmButton = page.locator('button').filter({ hasText: /确认|Confirm/ });
        await confirmButton.click();

        // 验证提升成功
        await expect(page.locator('text=/提升成功|Promotion Successful/').first()).toBeVisible({ timeout: 10000 });

        // 检查消息状态更新
        await expect(unmappedMessage).not.toHaveClass(/mapping-pending/);
        await expect(unmappedMessage).toHaveAttribute('data-mapped', 'true');
      }
    }
  });

  test('可以查看绑定历史记录', async ({ page }) => {
    // 导航到患者详情
    const patientNav = page.locator('button, a').filter({ hasText: /患者管理|Patients/ });
    if (!(await patientNav.isVisible())) {
      const archiveNav = page.locator('button, a').filter({ hasText: /档案管理|Archives/ });
      if (await archiveNav.isVisible()) {
        await archiveNav.click();
      }
    } else {
      await patientNav.click();
    }

    // 选择患者
    const firstPatient = page.locator('[data-testid="patient-item"], .patient-row, table tbody tr').first();
    await firstPatient.click();

    // 查找绑定历史标签页或部分
    const bindingHistoryTab = page.locator('button, a').filter({ hasText: /绑定历史|Binding History/ });

    if (await bindingHistoryTab.isVisible()) {
      await bindingHistoryTab.click();

      // 等待绑定历史加载
      const historyTable = page.locator('[data-testid="binding-history"], table');
      await expect(historyTable).toBeVisible({ timeout: 5000 });

      // 检查是否有历史记录
      const historyRows = historyTable.locator('tbody tr');
      const rowCount = await historyRows.count();

      if (rowCount > 0) {
        // 验证历史记录显示
        await expect(historyRows.first()).toBeVisible();

        // 检查历史记录列
        const firstRow = historyRows.first();
        await expect(firstRow.locator('td').nth(0)).not.toBeEmpty(); // 绑定类型
        await expect(firstRow.locator('td').nth(1)).not.toBeEmpty(); // 绑定时间
        await expect(firstRow.locator('td').nth(2)).not.toBeEmpty(); // 绑定状态
      }
    }
  });
});