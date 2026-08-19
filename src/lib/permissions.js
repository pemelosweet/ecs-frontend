import Parse from '@/lib/parse'
import { cloud } from '@/lib/request'
import { menuConfig } from '@/router/menuConfig'

// 角色常量（与后端 cloud/admin-constants.js 保持一致）
export const ROLE_ADMIN = 'admin'
export const ROLE_USER = 'user'

// 默认菜单权限（后端 MenuPermission 无数据时兜底，与 cloud/admin-constants.js 一致）
export const DEFAULT_MENU_PERMISSIONS = {
  admin: menuConfig.map((m) => m.key),
  user: menuConfig.filter((m) => !['/users', '/permissions'].includes(m.key)).map((m) => m.key),
}

// 管理员锁定菜单：默认勾选且禁止取消
export const ADMIN_LOCKED_MENUS = ['/permissions', '/users']

// 菜单权限缓存：按「用户 id + session token」失效
let menusCache = null
let menusCacheKey = null

export function getCurrentUser() {
  return Parse.User.current()
}

// 当前用户角色（老数据无 role 字段时按普通用户处理）
export function getUserRole(user = getCurrentUser()) {
  return user?.get('role') === ROLE_ADMIN ? ROLE_ADMIN : ROLE_USER
}

export function isAdmin(user = getCurrentUser()) {
  return getUserRole(user) === ROLE_ADMIN
}

function fallbackMenus(role) {
  return DEFAULT_MENU_PERMISSIONS[role] || DEFAULT_MENU_PERMISSIONS.user
}

/**
 * 获取当前用户可访问的菜单 key 列表（带缓存）。
 * 后端不可用时（离线/未部署）回退到角色默认值，保证页面可用。
 */
export async function loadMenuPermissions(force = false) {
  const user = getCurrentUser()
  if (!user) return []

  const key = `${user.id || ''}:${user.getSessionToken?.() || ''}`
  if (!force && menusCache && menusCacheKey === key) return menusCache

  const menus = await fetchMenus(user)
  menusCache = menus
  menusCacheKey = key
  return menus
}

// 拉取权限：优先服务端，异常/不可用时回退角色默认
async function fetchMenus(user) {
  try {
    const res = await cloud('getMenuPermissions')
    if (res && Array.isArray(res.menus) && res.menus.length) {
      return res.menus
    }
  } catch {
    // 网络/服务异常时用默认权限
  }
  return fallbackMenus(getUserRole(user))
}

// 登录/登出后调用，强制刷新
export function clearMenuCache() {
  menusCache = null
  menusCacheKey = null
}
