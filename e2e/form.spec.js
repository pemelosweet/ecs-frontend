import { test, expect } from '@playwright/test'

// FormPage e2e 测试：验证表单页的加载、交互、校验与提交流程

// 回填用的 mock 数据
const MOCK_LATEST = {
  id: 42,
  title: '回填标题',
  type: 'urgent',
  category: 'product',
  level: 5,
  date: '2026-06-15',
  status: true,
  desc: '这是回填的描述内容',
  attachments: [],
}

// 辅助：等待表单加载完成（Card loading 结束，表单字段可见）
async function waitForFormReady(page) {
  // 等待标题输入框出现，说明 Card 已结束 loading 态、表单已渲染
  await expect(page.locator('#title')).toBeVisible({ timeout: 10000 })
}

// 辅助：点击 antd Radio 选项（通过文本定位 radio-wrapper 再点击）
function getRadioByText(page, text) {
  return page.locator('.ant-radio-wrapper').filter({ hasText: text })
}

// 辅助：判断 Radio 是否选中（antd 在选中时给 .ant-radio-wrapper 添加 -checked 类）
async function expectRadioChecked(radioWrapper) {
  await expect(radioWrapper).toHaveClass(/ant-radio-wrapper-checked/)
}

async function expectRadioNotChecked(radioWrapper) {
  await expect(radioWrapper).not.toHaveClass(/ant-radio-wrapper-checked/)
}

test.describe('表单页 - 页面加载与初始化', () => {
  test('能访问 /form 并渲染表单字段', async ({ page }) => {
    // mock latest 返回 404（暂无数据），使用默认值
    await page.route('**/api/forms/latest', (route) =>
      route.fulfill({ status: 404, body: '{"detail":"not found"}' })
    )

    await page.goto('/form')
    await waitForFormReady(page)

    // 验证标题输入框有默认值
    await expect(page.locator('#title')).toHaveValue('默认标题')

    // 验证 Radio 默认选中"普通"
    await expectRadioChecked(getRadioByText(page, '普通'))

    // 验证 Switch 默认开启（antd Switch 选中时有 ant-switch-checked 类）
    await expect(page.locator('.ant-switch-checked')).toBeVisible()

    // 验证描述默认值
    await expect(page.locator('#desc')).toHaveValue('这是一段默认描述，可直接提交或按需修改。')

    // 验证日期选择器存在
    await expect(page.locator('.ant-picker')).toBeVisible()

    // 验证优先级默认值
    await expect(page.locator('.ant-input-number-input')).toHaveValue('1')

    // 验证分类 Select 默认显示"技术"
    await expect(page.locator('.ant-select-selection-item')).toHaveText('技术')

    // 验证上传区域存在
    await expect(page.getByText('点击或拖拽文件到此区域上传')).toBeVisible()
  })
})

test.describe('表单页 - API 回填数据', () => {
  test('mock /api/forms/latest 返回数据后表单回填', async ({ page }) => {
    await page.route('**/api/forms/latest', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_LATEST),
      })
    )

    await page.goto('/form')
    await waitForFormReady(page)

    // 验证标题回填
    await expect(page.locator('#title')).toHaveValue('回填标题')

    // Radio 应选中"紧急"
    await expectRadioChecked(getRadioByText(page, '紧急'))

    // Select 应显示"产品"
    await expect(page.locator('.ant-select-selection-item')).toHaveText('产品')

    // 优先级应为 5
    await expect(page.locator('.ant-input-number-input')).toHaveValue('5')

    // 描述应回填
    await expect(page.locator('#desc')).toHaveValue('这是回填的描述内容')
  })
})

test.describe('表单页 - 表单字段交互', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/forms/latest', (route) =>
      route.fulfill({ status: 404, body: '{"detail":"not found"}' })
    )
    await page.goto('/form')
    await waitForFormReady(page)
  })

  test('修改标题输入框', async ({ page }) => {
    const titleInput = page.locator('#title')
    await titleInput.clear()
    await titleInput.fill('新标题')
    await expect(titleInput).toHaveValue('新标题')
  })

  test('选择类型 Radio - 切换到紧急', async ({ page }) => {
    // 点击"紧急" radio
    await getRadioByText(page, '紧急').click()
    await expectRadioChecked(getRadioByText(page, '紧急'))
    await expectRadioNotChecked(getRadioByText(page, '普通'))
  })

  test('选择分类 Select - 切换到运营', async ({ page }) => {
    // 点击 Select 展开下拉框
    await page.locator('.ant-select-selector').click()
    // 在下拉面板中选择"运营"
    await page.locator('.ant-select-item-option').filter({ hasText: '运营' }).click()
    await expect(page.locator('.ant-select-selection-item')).toHaveText('运营')
  })

  test('修改优先级 InputNumber', async ({ page }) => {
    const numInput = page.locator('.ant-input-number-input')
    await numInput.clear()
    await numInput.fill('8')
    // 点击外部触发 blur 以确认值生效
    await page.locator('#title').click()
    await expect(numInput).toHaveValue('8')
  })
})

test.describe('表单页 - 表单校验', () => {
  test('清空标题后提交，显示校验错误', async ({ page }) => {
    await page.route('**/api/forms/latest', (route) =>
      route.fulfill({ status: 404, body: '{"detail":"not found"}' })
    )

    await page.goto('/form')
    await waitForFormReady(page)

    // 清空标题
    const titleInput = page.locator('#title')
    await titleInput.clear()

    // 点击提交按钮（antd 会在两个汉字间插入空格，用正则兼容"提 交"）
    await page.getByRole('button', { name: /提\s*交/ }).click()

    // 验证校验错误信息出现（antd Form.Item 校验失败时渲染错误文本）
    await expect(page.getByText('请输入标题')).toBeVisible()
  })
})

test.describe('表单页 - 表单提交成功', () => {
  test('正常填写后提交，显示成功提示', async ({ page }) => {
    await page.route('**/api/forms/latest', (route) =>
      route.fulfill({ status: 404, body: '{"detail":"not found"}' })
    )

    // mock POST /api/forms 返回成功
    await page.route('**/api/forms', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 99, message: 'ok' }),
      })
    )

    await page.goto('/form')
    await waitForFormReady(page)

    // 使用默认值直接提交（antd 会在两个汉字间插入空格，用正则兼容"提 交"）
    await page.getByRole('button', { name: /提\s*交/ }).click()

    // 验证 antd message 成功提示出现
    // antd v5 message 渲染在 .ant-message 容器中，成功通知含 .ant-message-success
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/提交成功/)).toBeVisible()
  })
})

test.describe('表单页 - 表单重置', () => {
  test('点击重置按钮后字段恢复为默认值', async ({ page }) => {
    await page.route('**/api/forms/latest', (route) =>
      route.fulfill({ status: 404, body: '{"detail":"not found"}' })
    )

    await page.goto('/form')
    await waitForFormReady(page)

    // 先修改标题
    const titleInput = page.locator('#title')
    await titleInput.clear()
    await titleInput.fill('已修改的标题')
    await expect(titleInput).toHaveValue('已修改的标题')

    // 点击重置按钮（antd 会在两个汉字间插入空格，用正则兼容"重 置"）
    await page.getByRole('button', { name: /重\s*置/ }).click()

    // 验证标题恢复为默认值
    await expect(titleInput).toHaveValue('默认标题')

    // Radio 恢复默认"普通"
    await expectRadioChecked(getRadioByText(page, '普通'))

    // 描述恢复默认
    await expect(page.locator('#desc')).toHaveValue('这是一段默认描述，可直接提交或按需修改。')
  })
})

test.describe('表单页 - 文件大小校验', () => {
  test('上传超过 10MB 的文件，显示错误提示', async ({ page }) => {
    await page.route('**/api/forms/latest', (route) =>
      route.fulfill({ status: 404, body: '{"detail":"not found"}' })
    )

    await page.goto('/form')
    await waitForFormReady(page)

    // 定位 antd Upload 内部隐藏的 input[type=file]
    const fileInput = page.locator('input[type="file"]').first()

    // 构造一个超过 10MB 的虚拟文件
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 'a')
    await fileInput.setInputFiles({
      name: 'big-file.zip',
      mimeType: 'application/zip',
      buffer: bigBuffer,
    })

    // 验证 beforeUpload 拦截后弹出的错误消息
    // antd v5 message.error 渲染在 .ant-message 容器中，含 .ant-message-error
    await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 })
    // 限定在 message 容器内匹配，避免与上传区提示文案冲突
    await expect(page.locator('.ant-message').getByText(/超过 10MB，已忽略/)).toBeVisible()
  })
})
