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
