import { Navigate } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import HomePage from '@/pages/HomePage'
import OrgPage from '@/pages/OrgPage'
import ProfilePage from '@/pages/ProfilePage'
import ImageHostPage from '@/pages/ImageHostPage'
import KnowledgeBasePage from '@/pages/KnowledgeBasePage'
import UserManagementPage from '@/pages/UserManagementPage'
import PermissionPage from '@/pages/PermissionPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import NotFound from '@/pages/NotFound'
import AuthGuard from '@/components/AuthGuard'
import PermissionGuard from '@/components/PermissionGuard'

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
      { path: 'images', element: <ImageHostPage /> },
      { path: 'knowledge', element: <KnowledgeBasePage /> },
      // 仅管理员可见（菜单过滤 + 路由级权限守卫双保险）
      {
        path: 'users',
        element: (
          <PermissionGuard path="/users">
            <UserManagementPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'permissions',
        element: (
          <PermissionGuard path="/permissions">
            <PermissionPage />
          </PermissionGuard>
        ),
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]
