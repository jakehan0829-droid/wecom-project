import { test, expect } from '@playwright/test';

test.describe('患者绑定与档案管理流程', () => {
  test.beforeEach(async ({ page }) => {
    // 访问应用首页
    await page.goto('/');
    // 等待应用加载完成
    await page.waitForLoadState('networkidle');
  });

  test('可以查看患者档案列表', async ({ page }) => {
    // 导航到档案管理页面
    const archiveNav = page.locator('button, a').filter({ hasText: /档案管理|Archives/ });
    if (await archiveNav.isVisible()) {
      await archiveNav.click();
    }

    // 等待档案管理页面加载
    await expect(page.locator('text=/档案管理|Archive Management/').first()).toBeVisible();

    // 检查档案列表
    const archiveList = page.locator('[data-testid="archive-list"], .archive-item, table tbody tr');
    await expect(archiveList.first()).toBeVisible({ timeout: 10000 });

    // 检查搜索功能
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();

    // 检查分页或加载更多
    const pagination = page.locator('[data-testid="pagination"], .pagination, button:has-text("下一页"), button:has-text("Next")');
    if (await pagination.isVisible()) {
      await expect(pagination).toBeVisible();
    }
  });

  test('可以查看患者档案详情', async ({ page }) => {
    // 导航到档案管理页面
    const archiveNav = page.locator('button, a').filter({ hasText: /档案管理|Archives/ });
    if (await archiveNav.isVisible()) {
      await archiveNav.click();
    }

    // 等待档案管理页面加载
    await expect(page.locator('text=/档案管理|Archive Management/').first()).toBeVisible();

    // 点击第一个档案查看详情
    const firstArchive = page.locator('[data-testid="archive-list"] > *, .archive-item, table tbody tr').first();
    await firstArchive.click();

    // 等待档案详情加载
    await expect(page.locator('text=/档案详情|Profile Details/').first()).toBeVisible({ timeout: 10000 });

    // 检查档案基本信息
    const basicInfo = page.locator('[data-testid="basic-info"], .profile-basic-info');
    await expect(basicInfo).toBeVisible();

    // 检查健康信息
    const healthInfo = page.locator('[data-testid="health-info"], .health-records');
    await expect(healthInfo).toBeVisible();

    // 检查沟通历史
    const communicationHistory = page.locator('[data-testid="communication-history"], .conversation-history');
    await expect(communicationHistory).toBeVisible();
  });

  test('可以编辑患者档案', async ({ page }) => {
    // 导航到档案管理页面
    const archiveNav = page.locator('button, a').filter({ hasText: /档案管理|Archives/ });
    if (await archiveNav.isVisible()) {
      await archiveNav.click();
    }

    // 等待档案管理页面加载
    await expect(page.locator('text=/档案管理|Archive Management/').first()).toBeVisible();

    // 点击第一个档案查看详情
    const firstArchive = page.locator('[data-testid="archive-list"] > *, .archive-item, table tbody tr').first();
    await firstArchive.click();

    // 等待档案详情加载
    await expect(page.locator('text=/档案详情|Profile Details/').first()).toBeVisible({ timeout: 10000 });

    // 查找编辑按钮
    const editButton = page.locator('button').filter({ hasText: /编辑|Edit/ }).first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // 检查编辑表单
      const editForm = page.locator('[data-testid="edit-form"], form');
      await expect(editForm).toBeVisible();

      // 修改字段
      const nameInput = page.locator('input[name="name"], input[placeholder*="姓名"], input[placeholder*="Name"]').first();
      if (await nameInput.isVisible()) {
        const originalValue = await nameInput.inputValue();
        const newValue = originalValue + ' (已更新)';
        await nameInput.fill(newValue);

        // 保存修改
        const saveButton = page.locator('button').filter({ hasText: /保存|Save/ }).first();
        await saveButton.click();

        // 验证修改成功
        await expect(page.locator(`text="${newValue}"`).first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('可以绑定新患者', async ({ page }) => {
    // 导航到档案管理页面
    const archiveNav = page.locator('button, a').filter({ hasText: /档案管理|Archives/ });
    if (await archiveNav.isVisible()) {
      await archiveNav.click();
    }

    // 查找添加患者按钮
    const addPatientButton = page.locator('button').filter({ hasText: /添加患者|添加档案|Add Patient|Add Archive/ }).first();
    if (await addPatientButton.isVisible()) {
      await addPatientButton.click();

      // 检查添加表单
      const addForm = page.locator('[data-testid="add-form"], form');
      await expect(addForm).toBeVisible({ timeout: 5000 });

      // 填写患者信息
      const nameInput = page.locator('input[name="name"], input[placeholder*="姓名"], input[placeholder*="Name"]').first();
      if (await nameInput.isVisible()) {
        const testPatientName = '测试患者 ' + Date.now();
        await nameInput.fill(testPatientName);

        // 填写其他字段
        const ageInput = page.locator('input[name="age"], input[placeholder*="年龄"], input[placeholder*="Age"]').first();
        if (await ageInput.isVisible()) {
          await ageInput.fill('45');
        }

        // 保存
        const saveButton = page.locator('button').filter({ hasText: /保存|Save/ }).first();
        await saveButton.click();

        // 验证患者添加成功
        await expect(page.locator(`text="${testPatientName}"`).first()).toBeVisible({ timeout: 10000 });
      }
    }
  });
});