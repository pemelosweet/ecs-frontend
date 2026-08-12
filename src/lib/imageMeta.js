// 图床展示工具：马赛克底样式 + 元信息格式化
export const CHECKER_BG = {
  backgroundColor: '#fafafa',
  backgroundImage:
    'linear-gradient(45deg, #e8e8e8 25%, transparent 25%, transparent 75%, #e8e8e8 75%), ' +
    'linear-gradient(45deg, #e8e8e8 25%, transparent 25%, transparent 75%, #e8e8e8 75%)',
  backgroundPosition: '0 0, 8px 8px',
  backgroundSize: '16px 16px',
}

export const formatSize = (bytes) => {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export const formatMime = (mime) => (mime || '').split('/')[1]?.toUpperCase() || '-'

// 宽高 + 兆像素：800 × 800 px | 0.6 MP；无宽高（旧记录）返回空串
export const formatDimensions = (width, height) => {
  if (!width || !height) return ''
  return `${width} × ${height} px | ${((width * height) / 1e6).toFixed(1)} MP`
}

export const formatDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}`
}
