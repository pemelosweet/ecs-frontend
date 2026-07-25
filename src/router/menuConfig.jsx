import { FormOutlined } from '@ant-design/icons'

// 菜单 / 路由配置，集中管理，便于生成侧边栏菜单与面包屑
export const menuConfig = [
  {
    key: '/form',
    label: '表单页',
    icon: <FormOutlined />,
  },
]

// 扁平化，用于根据路径查找标题（面包屑 / 页签）
export const findMenuByPath = (path) =>
  menuConfig.find((item) => item.key === path)
