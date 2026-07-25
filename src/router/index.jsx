import { Navigate } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import FormPage from '@/pages/FormPage'
import NotFound from '@/pages/NotFound'

// 路由表（无登录 / 鉴权，直接进入主布局）
export const routes = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/form" replace /> },
      { path: 'form', element: <FormPage /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]
