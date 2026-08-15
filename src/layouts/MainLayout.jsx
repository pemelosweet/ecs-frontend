import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Breadcrumb, Button, Avatar, theme, Dropdown, message, Tag, Spin } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { menuConfig, findMenuByPath } from '@/router/menuConfig'
import { loadMenuPermissions, clearMenuCache, isAdmin } from '@/lib/permissions'
import Parse from '@/lib/parse'

const { Header, Sider, Content } = Layout

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [menus, setMenus] = useState(null) // null = 权限加载中
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBorderSecondary, colorTextSecondary, colorPrimary },
  } = theme.useToken()

  const current = findMenuByPath(location.pathname)
  const currentUser = Parse.User.current()

  // 加载当前用户可访问菜单（带缓存，后端不可用时回退角色默认）
  useEffect(() => {
    let mounted = true
    loadMenuPermissions().then((allowed) => {
      if (mounted) setMenus(allowed)
    })
    return () => {
      mounted = false
    }
  }, [])

  const handleLogout = async () => {
    await Parse.User.logOut()
    clearMenuCache()
    message.success('已登出')
    navigate('/login', { replace: true })
  }

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  // 按权限过滤侧边菜单
  const allowedMenus = menus ? menuConfig.filter((m) => menus.includes(m.key)) : []

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
        {/* 品牌区 */}
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
          items={menus ? allowedMenus : []}
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
          {/* 右侧用户区 */}
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: colorTextSecondary,
            }}
          >
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar size={28} icon={<UserOutlined />} />
                <span>{currentUser?.get('username') || '用户'}</span>
                {isAdmin(currentUser) ? (
                  <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                    管理员
                  </Tag>
                ) : (
                  <Tag style={{ marginInlineEnd: 0 }}>普通用户</Tag>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 16 }}>
          <Breadcrumb
            style={{ marginBottom: 16 }}
            items={[{ title: '首页' }, { title: current?.label || '未知页面' }]}
          />
          {menus ? (
            <Outlet />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
              <Spin size="large" />
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  )
}
