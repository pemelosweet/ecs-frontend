import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Breadcrumb, Button, Avatar, theme, Dropdown, message } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { menuConfig, findMenuByPath } from '@/router/menuConfig'
import Parse from '@/lib/parse'

const { Header, Sider, Content } = Layout

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBorderSecondary, colorTextSecondary, colorPrimary },
  } = theme.useToken()

  const current = findMenuByPath(location.pathname)
  const currentUser = Parse.User.current()

  const handleLogout = async () => {
    await Parse.User.logOut()
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
          items={menuConfig}
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
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 16 }}>
          <Breadcrumb
            style={{ marginBottom: 16 }}
            items={[{ title: '首页' }, { title: current?.label || '未知页面' }]}
          />
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
