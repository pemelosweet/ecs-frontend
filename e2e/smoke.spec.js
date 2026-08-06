import { test, expect } from '@playwright/test'

// e2e 冒烟测试：验证核心路径可用
test.describe('冒烟测试', () => {
  test('未登录访问 / 重定向到 /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText('登录')).toBeVisible()
  })

  test('登录页可访问，有注册链接', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByPlaceholder('用户名')).toBeVisible()
    await expect(page.getByRole('link', { name: '立即注册' })).toBeVisible()
  })

  test('未知路径显示 404 页面', async ({ page }) => {
    await page.goto('/not-exist')
    await expect(page.getByText('抱歉，你访问的页面不存在。')).toBeVisible()
  })
})
