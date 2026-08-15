import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { loadMenuPermissions } from '@/lib/permissions'

/**
 * 路由级权限守卫：当前用户菜单权限不含该路径时重定向到 /home
 * 与侧边菜单过滤共用同一份权限数据（loadMenuPermissions 带缓存）
 */
export default function PermissionGuard({ path, children }) {
  const [allowed, setAllowed] = useState(null) // null = 加载中

  useEffect(() => {
    let mounted = true
    loadMenuPermissions().then((menus) => {
      if (mounted) setAllowed(menus.includes(path))
    })
    return () => {
      mounted = false
    }
  }, [path])

  if (allowed === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!allowed) {
    return <Navigate to="/home" replace />
  }
  return children
}
