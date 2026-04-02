import { test, expect } from '@playwright/test';

test.describe('企业微信项目端到端测试', () => {
  test.beforeEach(async ({ page }) => {
    // 访问应用首页
    await page.goto('/');
  });

  test('应用能够正常加载', async ({ page }) => {
    // 检查页面标题或关键元素
    await expect(page).toHaveTitle(/企微项目|WeCom/);

    // 检查是否有加载状态或关键UI元素
    const appContainer = page.locator('#root');
    await expect(appContainer).toBeVisible();
  });

  test('仪表板页面可以访问', async ({ page }) => {
    // 这里需要根据实际应用的路由进行调整
    // 假设应用默认显示仪表板
    const dashboardTitle = page.locator('h1, h2').filter({ hasText: /仪表板|Dashboard/ });
    await expect(dashboardTitle).toBeVisible({ timeout: 10000 });
  });

  test('可以在不同页面间导航', async ({ page }) => {
    // 查找导航元素并点击
    // 这里需要根据实际应用的导航结构进行调整
    const archiveNav = page.locator('button, a').filter({ hasText: /档案管理|Archives/ });

    if (await archiveNav.isVisible()) {
      await archiveNav.click();

      // 验证导航到档案管理页面
      const archiveTitle = page.locator('h1, h2').filter({ hasText: /档案管理|Archive/ });
      await expect(archiveTitle).toBeVisible();
    }
  });

  test('可以切换到医生工作台', async ({ page }) => {
    // 查找医生工作台导航
    const workbenchNav = page.locator('button, a').filter({ hasText: /医生工作台|Workbench/ });

    if (await workbenchNav.isVisible()) {
      await workbenchNav.click();

      // 验证导航到医生工作台
      const workbenchTitle = page.locator('h1, h2').filter({ hasText: /医生工作台|Workbench/ });
      await expect(workbenchTitle).toBeVisible();
    }
  });
});