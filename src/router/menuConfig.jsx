import { HomeOutlined, FormOutlined, BankOutlined } from '@ant-design/icons'

// 菜单 / 路由配置，集中管理，便于生成侧边栏菜单与面包屑
export const menuConfig = [
  {
    key: '/home',
    label: '首页',
    icon: <HomeOutlined />,
  },
  {
    key: '/form',
    label: '表单页',
    icon: <FormOutlined />,
  },
  {
    key: '/org',
    label: '组织信息',
    icon: <BankOutlined />,
  },
]

// 扁平化，用于根据路径查找标题（面包屑 / 页签）
export const findMenuByPath = (path) =>
  menuConfig.find((item) => item.key === path)
