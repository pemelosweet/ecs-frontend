# 整体布局与视觉风格优化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按已批准的设计文档（`docs/2026-07-26-layout-style-redesign-design.md`）将系统升级为「云控台浅色蓝」风格：白色侧栏 + 靛蓝 `#2f54eb` 主色 + 描边卡片，并修复 404 页死链。

**Architecture:** 全部视觉变化通过 antd 5 `ConfigProvider` 主题 token（含 Layout/Menu 组件级 token）+ `MainLayout.jsx` 结构精修实现，页面代码不散落硬编码色值；不引入新依赖，不改业务逻辑与接口。

**Tech Stack:** React 18 + Vite 5 + Ant Design 5 + react-router-dom v6；测试 Vitest + RTL（jsdom）、Playwright e2e。

**执行前置：** 按 AGENTS.md 标准模式第 1 步，先用 `using-git-worktrees` 技能创建隔离工作区再开工。

**设计落地澄清（消除卡片嵌套）：** 设计文档同时要求"布局内容容器描边卡片"和"页面卡片描边化"。现状是布局白容器内再套页面 Card，会形成边框套边框。本计划的落地决策：**移除布局层的白色包裹容器，内容区直接露出 `#f5f7fa` 底色，由各页面自己的 antd `Card`（默认带边框，边框色走 token）充当描边卡片**。三个业务页面（HomePage/FormPage/OrgPage）均已使用 Card，无需改动页面代码。

---

## 文件清单

| 操作 | 文件 | 职责 |
|---|---|---|
| Create | `src/pages/NotFound/index.test.jsx` | 404 页跳转行为的单元测试（TDD） |
| Modify | `src/pages/NotFound/index.jsx:20` | 死链 `/dashboard` → `/home` |
| Modify | `src/main.jsx:13-18` | 注入全套设计令牌 |
| Modify | `src/index.css:13-16` | body 底色 `#f5f7fa` |
| Modify | `src/layouts/MainLayout.jsx`（整文件） | 白侧栏 + 品牌区 + 页头用户区 + 去包裹容器 |

---

### Task 1: 修复 404 页死链（TDD）

**Files:**
- Test: `src/pages/NotFound/index.test.jsx`（新建）
- Modify: `src/pages/NotFound/index.jsx:20`

- [ ] **Step 1: 写失败测试**

创建 `src/pages/NotFound/index.test.jsx`：

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import NotFound from './index.jsx'

// 404 页「返回首页」应跳转到 /home（路由表里不存在 /dashboard）
test('点击返回首页跳转到 /home', async () => {
  render(
    <MemoryRouter initialEntries={['/not-exist']}>
      <Routes>
        <Route path="/home" element={<div>首页内容</div>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>
  )
  await userEvent.click(screen.getByRole('button', { name: '返回首页' }))
  expect(screen.getByText('首页内容')).toBeInTheDocument()
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/pages/NotFound`
Expected: FAIL —— 点击后仍停留在 404 页，找不到「首页内容」

- [ ] **Step 3: 最小实现**

修改 `src/pages/NotFound/index.jsx` 第 20 行：

```jsx
// 修改前
<Button type="primary" onClick={() => navigate('/dashboard')}>
// 修改后
<Button type="primary" onClick={() => navigate('/home')}>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/pages/NotFound`
Expected: PASS (1 passed)

- [ ] **Step 5: 提交**

```bash
git add src/pages/NotFound/index.jsx src/pages/NotFound/index.test.jsx
git commit -m "fix: 修复404页返回首页死链并补充单元测试"
```

---

### Task 2: 全局设计令牌注入

**Files:**
- Modify: `src/main.jsx:11-19`
- Modify: `src/index.css:13-16`

- [ ] **Step 1: 修改 `src/main.jsx` 的 ConfigProvider theme**

将现有 `theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6 } }}` 整体替换为：

```jsx
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          // 云控台浅色蓝：设计令牌见 docs/2026-07-26-layout-style-redesign-design.md
          colorPrimary: '#2f54eb',
          borderRadius: 8,
          colorBgLayout: '#f5f7fa',
          colorText: '#0f172a',
          colorTextSecondary: '#64748b',
          colorBorderSecondary: '#e5e9f0',
        },
        components: {
          Layout: {
            siderBg: '#ffffff',
            headerBg: '#ffffff',
            headerHeight: 56,
            headerPadding: '0 16px',
          },
          Menu: {
            itemSelectedBg: '#eef2ff',
            itemSelectedColor: '#2f54eb',
            itemColor: '#64748b',
          },
        },
      }}
    >
```

- [ ] **Step 2: 修改 `src/index.css` 的 body 规则**

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #f5f7fa; /* 与 antd colorBgLayout 保持一致 */
}
```

- [ ] **Step 3: 验证测试与构建**

Run: `npm test`
Expected: 全部 PASS（token 变更不影响行为断言）

Run: `npm run build`
Expected: 构建成功，无报错

- [ ] **Step 4: 提交**

```bash
git add src/main.jsx src/index.css
git commit -m "feat: 注入云控台浅色蓝全局设计令牌"
```

---

### Task 3: MainLayout 改造（白侧栏 + 品牌区 + 页头用户区）

**Files:**
- Modify: `src/layouts/MainLayout.jsx`（整文件替换）

- [ ] **Step 1: 用以下完整内容替换 `src/layouts/MainLayout.jsx`**

```jsx
import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Breadcrumb, Button, Avatar, theme } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { menuConfig, findMenuByPath } from '@/router/menuConfig'

const { Header, Sider, Content } = Layout

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBorderSecondary, colorTextSecondary, colorPrimary },
  } = theme.useToken()

  const current = findMenuByPath(location.pathname)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        width={208}
        style={{ borderRight: `1px solid ${colorBorderSecondary}` }}
      >
        {/* 品牌区：靛蓝菱形 ◆ 是全站签名元素，折叠时只保留菱形 */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontWeight: 600,
            fontSize: 16,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span style={{ color: colorPrimary, fontSize: 18 }}>◆</span>
          {!collapsed && <span>中后台管理系统</span>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuConfig}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${colorBorderSecondary}`,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 40, height: 40 }}
          />
          <span style={{ marginLeft: 8, fontWeight: 600, fontSize: 16 }}>
            {current?.label || ''}
          </span>
          {/* 右侧用户区：静态占位，后续接入登录态 */}
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: colorTextSecondary,
            }}
          >
            <Avatar size={28} icon={<UserOutlined />} />
            <span>管理员</span>
          </div>
        </Header>
        <Content style={{ margin: 16 }}>
          <Breadcrumb
            style={{ marginBottom: 16 }}
            items={[
              { title: '首页' },
              { title: current?.label || '未知页面' },
            ]}
          />
          {/* 不再包白色容器：内容区露出 #f5f7fa 底色，页面自己的 Card 即描边卡片 */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
```

要点核对（防止改丢功能）：
- 折叠按钮、`selectedKeys={[location.pathname]}` 菜单高亮、面包屑、`findMenuByPath` 全部保留
- 移除了 `theme="dark"`（Sider 与 Menu）与内容白容器 div
- 新增 `Avatar`、`UserOutlined` 导入，移除不再使用的 `colorBgContainer`、`borderRadiusLG`

- [ ] **Step 2: 跑单元 + 集成测试**

Run: `npm test`
Expected: 全部 PASS（`tests/integration/router.test.jsx` 用 menuitem 角色定位，浅色菜单不影响）

- [ ] **Step 3: 提交**

```bash
git add src/layouts/MainLayout.jsx
git commit -m "feat: MainLayout改造为白侧栏云控台风格"
```

---

### Task 4: 质量门禁 + 视觉走查

**Files:** 无新增修改（如走查发现问题，修复后补提交）

- [ ] **Step 1: IDE 诊断**

对 `src/main.jsx`、`src/index.css`、`src/layouts/MainLayout.jsx`、`src/pages/NotFound/index.jsx` 执行诊断，Expected: 0 error

- [ ] **Step 2: 全量测试**

Run: `npm test`
Expected: 单元 + 集成全部 PASS

- [ ] **Step 3: e2e**

Run: `npm run test:e2e`
Expected: 3 个冒烟用例全部 PASS（`getByRole('menuitem')` 定位与主题无关）

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 5: 视觉走查（ui-interaction 清单）**

启动 `npm run dev`（后台），逐项确认：
- 侧栏白底、选中项浅蓝药丸 `#eef2ff` + 靛蓝字
- 品牌区 ◆ 靛蓝菱形，折叠后只剩 ◆
- 页头白底细描边，右侧头像 + 「管理员」
- 内容区雾蓝灰底，页面 Card 为 1px 描边卡片，无嵌套双白框
- 三个页面 + 404 页均正常；404「返回首页」跳 `/home`
- 刷新直达 `/form`、`/org` 菜单高亮正确

- [ ] **Step 6: 收尾提交（如有走查修复）**

```bash
git add -A
git commit -m "fix: 视觉走查问题修复"
```

无修复则跳过本步。

---

## 自检记录

- 规格覆盖：令牌表→Task 2；布局四项改造→Task 3；页面统一（经嵌套澄清后页面零改动）；NotFound 修复→Task 1；验收标准→Task 4 ✅
- 无占位符：所有代码步骤均含完整代码 ✅
- 类型一致：token 名（`colorBorderSecondary`/`colorTextSecondary`）在 Task 2 定义、Task 3 消费，命名一致 ✅
