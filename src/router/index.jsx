import { Navigate } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import HomePage from '@/pages/HomePage'
import OrgPage from '@/pages/OrgPage'
import ProfilePage from '@/pages/ProfilePage'
import NotFound from '@/pages/NotFound'

// 路由表（无登录 / 鉴权，直接进入主布局）
export const routes = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <HomePage /> },
      { path: 'org', element: <OrgPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]
