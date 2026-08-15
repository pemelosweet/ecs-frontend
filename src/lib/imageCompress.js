// 图床前端压缩工具（方案 A：canvas 重编码）
// 目标：上传前在浏览器压缩，减少 OSS 存储与流量开销

// 类型白名单（与服务端 oss-sign.js 一致；服务端仍会最终校验）
export const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
// 原始文件超大直接拒绝（防内存/带宽滥用），压缩后小图不受此限
export const MAX_RAW_SIZE_MB = 30
export const MAX_RAW_SIZE_BYTES = MAX_RAW_SIZE_MB * 1024 * 1024
// 压缩参数：最长边上限 + 质量（WebP/JPEG）
export const COMPRESS_MAX_EDGE = 2048
export const COMPRESS_QUALITY = 0.82

// WebP 支持检测（模块级缓存，一次性探测）
let webpSupported = null
const detectWebp = () => {
  if (webpSupported !== null) return webpSupported
  try {
    const canvas = document.createElement('canvas')
    webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    webpSupported = false
  }
  return webpSupported
}

// 解码图片为 Image 元素
const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解析失败'))
    }
    img.src = url
  })

/**
 * 前端压缩（canvas 重编码）：
 * - GIF 动画：原样直传（canvas 会变成静态图）
 * - JPEG：重编码 JPEG
 * - PNG / WebP：优先转 WebP（保留透明通道）；浏览器不支持 WebP 时回退原格式
 * - 未超最长边且目标格式不变：直接用原文件，避免无谓重编码损耗
 * - 任何异常回退原文件，不阻断上传
 * @returns {Promise<{file: File, changed: boolean}>}
 */
export const compressImage = async (file) => {
  if (file.type === 'image/gif') return { file, changed: false }
  const targetType =
    file.type === 'image/jpeg' ? 'image/jpeg' : detectWebp() ? 'image/webp' : file.type
  try {
    const { img, url } = await loadImageElement(file)
    try {
      const srcW = img.naturalWidth
      const srcH = img.naturalHeight
      const scale = Math.min(1, COMPRESS_MAX_EDGE / Math.max(srcW, srcH))
      const w = Math.max(1, Math.round(srcW * scale))
      const h = Math.max(1, Math.round(srcH * scale))
      if (w === srcW && h === srcH && targetType === file.type) {
        return { file, changed: false }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      // 非 JPEG 源转 JPEG 时透明区域填白底，避免变黑
      if (targetType === 'image/jpeg' && file.type !== 'image/jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
      }
      ctx.drawImage(img, 0, 0, w, h)
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('压缩失败'))),
          targetType,
          COMPRESS_QUALITY
        )
      })
      return { file: new File([blob], file.name, { type: blob.type || targetType }), changed: true }
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    return { file, changed: false }
  }
}

// 读取图片宽高（压缩后文件；带超时兜底，失败不阻断上传）
export const readImageSize = (file, timeoutMs = 8000) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    let settled = false
    const finish = (meta) => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(url)
      resolve(meta)
    }
    const timer = setTimeout(() => finish({}), timeoutMs)
    img.onload = () => {
      clearTimeout(timer)
      finish({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      clearTimeout(timer)
      finish({})
    }
    img.src = url
  })
