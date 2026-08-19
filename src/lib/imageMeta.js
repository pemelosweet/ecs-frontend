// 图床展示工具：元信息格式化（棋盘格底样式见 ImageCard.module.less）

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
