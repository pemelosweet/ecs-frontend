import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import Parse from '@/lib/parse'
import { loadMenuPermissions } from '@/lib/permissions'

/**
 * 路由守卫：未登录时重定向到 /login；
 * 已登录时预加载菜单权限（供侧边栏过滤与路由级守卫复用）
 */
export default function AuthGuard({ children }) {
  const user = Parse.User.current()

  useEffect(() => {
    if (user) {
      loadMenuPermissions().catch(() => {})
    }
  }, [user])

  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}
