import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'

// 集成测试示例：路由 + 布局 + 页面协同工作
describe('路由与布局集成', () => {
  it('访问 / 重定向到 /home，并在主布局中渲染首页', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    // 首页内容出现
    expect(await screen.findByText('欢迎使用管理系统')).toBeInTheDocument()
    // 侧边菜单同时存在（说明 MainLayout 生效）
    expect(screen.getByText('组织信息')).toBeInTheDocument()
  })

  it('未知路径命中 404 页面', async () => {
    render(
      <MemoryRouter initialEntries={['/not-exist']}>
        <App />
      </MemoryRouter>
    )
    expect(await screen.findByText('抱歉，你访问的页面不存在。')).toBeInTheDocument()
  })
})
