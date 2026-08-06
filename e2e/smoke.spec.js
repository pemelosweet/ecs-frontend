import { test, expect } from '@playwright/test'

// e2e 冒烟测试：真实浏览器验证核心路径可用
test.describe('冒烟测试', () => {
  test('首页可访问，/ 重定向到 /home', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByText('欢迎使用管理系统')).toBeVisible()
  })

  test('未知路径显示 404 页面', async ({ page }) => {
    await page.goto('/not-exist')
    await expect(page.getByText('抱歉，你访问的页面不存在。')).toBeVisible()
  })
})
