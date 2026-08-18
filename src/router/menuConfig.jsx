import {
  HomeOutlined,
  BankOutlined,
  IdcardOutlined,
  PictureOutlined,
  BookOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'

// 菜单 / 路由配置，集中管理，便于生成侧边栏菜单与面包屑
// 新增菜单时需同步后端 cloud/admin-constants.js 的 DEFAULT_MENUS
export const menuConfig = [
  {
    key: '/home',
    label: '首页',
    icon: <HomeOutlined />,
  },
  {
    key: '/org',
    label: '组织信息',
    icon: <BankOutlined />,
  },
  {
    key: '/profile',
    label: '个人档案',
    icon: <IdcardOutlined />,
  },
  {
    key: '/images',
    label: '图床',
    icon: <PictureOutlined />,
  },
  {
    key: '/knowledge',
    label: '知识库',
    icon: <BookOutlined />,
  },
  {
    key: '/users',
    label: '用户管理',
    icon: <TeamOutlined />,
    adminOnly: true,
  },
  {
    key: '/permissions',
    label: '权限管理',
    icon: <SafetyCertificateOutlined />,
    adminOnly: true,
  },
]

// 管理员锁定菜单：默认勾选且禁止取消（与后端 cloud/admin-constants.js 的 LOCKED_MENUS 一致）
export const ADMIN_LOCKED_MENUS = ['/permissions', '/users']

// 扁平化，用于根据路径查找标题（面包屑 / 页签）
export const findMenuByPath = (path) => menuConfig.find((item) => item.key === path)
