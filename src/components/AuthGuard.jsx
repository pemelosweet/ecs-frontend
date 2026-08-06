import { Navigate } from 'react-router-dom'
import Parse from '@/lib/parse'

/**
 * 路由守卫：未登录时重定向到 /login
 */
export default function AuthGuard({ children }) {
  const user = Parse.User.current()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}
