import { Navigate } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import HomePage from '@/pages/HomePage'
import OrgPage from '@/pages/OrgPage'
import ProfilePage from '@/pages/ProfilePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import NotFound from '@/pages/NotFound'
import AuthGuard from '@/components/AuthGuard'

// 路由表
export const routes = [
  // 公开路由（无需登录）
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  // 需要登录的路由
  {
    path: '/',
    element: (
      <AuthGuard>
        <MainLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <HomePage /> },
      { path: 'org', element: <OrgPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]
