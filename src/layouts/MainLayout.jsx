import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Breadcrumb, Button, Avatar, Dropdown, message, Tag, Spin } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { menuConfig, findMenuByPath } from '@/router/menuConfig'
import { loadMenuPermissions, clearMenuCache, isAdmin } from '@/lib/permissions'
import Parse from '@/lib/parse'
import styles from './MainLayout.module.less'

const { Header, Sider, Content } = Layout

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [menus, setMenus] = useState(null) // null = 权限加载中
  const navigate = useNavigate()
  const location = useLocation()

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
    <Layout className={styles.layout}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        width={208}
        className={styles.sider}
      >
        {/* 品牌区 */}
        <div className={styles.brand}>
          <span className={styles.brandMark}>◆</span>
          {!collapsed && <span>中后台管理系统</span>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menus ? allowedMenus : []}
          onClick={({ key }) => navigate(key)}
          className={styles.menu}
        />
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className={styles.collapseBtn}
          />
          <span className={styles.headerTitle}>{current?.label || ''}</span>
          {/* 右侧用户区 */}
          <div className={styles.headerRight}>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className={styles.userTrigger}>
                <Avatar size={28} icon={<UserOutlined />} />
                <span>{currentUser?.get('username') || '用户'}</span>
                {isAdmin(currentUser) ? (
                  <Tag color="blue" className={styles.roleTag}>
                    管理员
                  </Tag>
                ) : (
                  <Tag className={styles.roleTag}>普通用户</Tag>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className={styles.content}>
          <Breadcrumb
            className={styles.breadcrumb}
            items={[{ title: '首页' }, { title: current?.label || '未知页面' }]}
          />
          {menus ? (
            <Outlet />
          ) : (
            <div className={styles.loadingWrap}>
              <Spin size="large" />
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  )
}
