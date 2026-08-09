// 错误提示中文化：Parse Server 内置英文文案 → 中文映射
// 已是中文的提示（服务端自定义文案）原样透传

// 规则项：[正则, 中文文案]，第二个元素也可以是函数 (msg) => 中文（用于提取原文中的数字等）
const RULES = [
  [
    /account is locked.*?(\d+)\s*minute/i,
    (msg, n) => `连续输错次数过多，账号已锁定，请 ${n} 分钟后再试`,
  ],
  [/account is locked/i, '连续输错次数过多，账号已锁定，请稍后再试'],
  [/invalid username or password/i, '用户名或密码错误'],
  [/username .*already .*taken/i, '用户名已被占用'],
  [/email .*already .*taken/i, '邮箱已被占用'],
  [/password does not meet/i, '密码不符合安全要求（至少 8 位）'],
  [/password is required/i, '请输入密码'],
  [/invalid session token/i, '登录已过期，请重新登录'],
  [/object not found/i, '数据不存在或已被删除'],
  [/permission denied|insufficient auth/i, '无权执行该操作'],
  [/too many requests|rate ?limit|exceeded the limit/i, '请求过于频繁，请稍后再试'],
  [/failed to fetch|network|xmlhttprequest/i, '网络异常，请检查连接后重试'],
  [/timeout|timed out/i, '请求超时，请稍后重试'],
  [/could not connect/i, '服务暂不可用，请稍后重试'],
]

// 含中文字符则视为已是中文文案，原样返回
const hasChinese = (s) => /[\u4e00-\u9fa5]/.test(s)

export function zhError(err, fallback = '操作失败，请稍后重试') {
  const msg = err?.message || ''
  if (!msg) return fallback
  if (hasChinese(msg)) return msg
  for (const [re, zh] of RULES) {
    const m = msg.match(re)
    if (m) return typeof zh === 'function' ? zh(msg, ...m.slice(1)) : zh
  }
  return msg
}
