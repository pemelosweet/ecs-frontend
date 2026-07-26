import { test, expect } from '@playwright/test'

// e2e 冒烟测试：真实浏览器验证核心路径可用
test.describe('冒烟测试', () => {
  test('首页可访问，/ 重定向到 /home', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByText('欢迎使用表单系统')).toBeVisible()
  })

  test('侧边菜单可导航到表单页', async ({ page }) => {
    await page.goto('/home')
    // 首页正文也含“表单页”字样，用菜单角色精确定位
    await page.getByRole('menuitem', { name: '表单页' }).click()
    await expect(page).toHaveURL(/\/form$/)
  })

  test('未知路径显示 404 页面', async ({ page }) => {
    await page.goto('/not-exist')
    await expect(page.getByText('抱歉，你访问的页面不存在。')).toBeVisible()
  })
})
