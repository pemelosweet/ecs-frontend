import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Card,
  Upload,
  Progress,
  Empty,
  Pagination,
  Button,
  Input,
  DatePicker,
  Space,
  message,
  Tag,
} from 'antd'
import { InboxOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { cloud } from '@/lib/request'
import { zhError } from '@/lib/errorMsg'
import {
  ALLOWED_TYPES,
  MAX_RAW_SIZE_MB,
  MAX_RAW_SIZE_BYTES,
  compressImage,
  readImageSize,
} from '@/lib/imageCompress'
import ImageCard from './ImageCard'
import styles from './index.module.less'

const PAGE_SIZE = 12

// 组装列表查询参数（纯函数）
const buildParams = (p, f) => {
  const params = { limit: PAGE_SIZE, skip: (p - 1) * PAGE_SIZE }
  if (f.name) params.name = f.name
  if (f.start) params.startDate = f.start
  if (f.end) params.endDate = f.end
  return params
}

export default function ImageHostPage() {
  const [images, setImages] = useState([])
  const [total, setTotal] = useState(0)
  const [quota, setQuota] = useState(null) // { used, limit }
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [nameInput, setNameInput] = useState('') // 搜索框输入（未应用）
  const [dateRange, setDateRange] = useState(null) // 日期范围选择（未应用）
  const [filters, setFilters] = useState({}) // 已应用的搜索条件 { name, start, end }
  const uploadingRef = useRef(false) // 上传锁：防拖拽多文件并发

  const hasSearch = Boolean(filters.name || filters.start || filters.end)

  // 数据加载（单一入口，DRY；调用方负责 loading 反馈）
  const loadImages = useCallback(async (p, f) => {
    try {
      const res = await cloud('imageHostList', buildParams(p, f))
      setImages(res.results || [])
      setTotal(res.total || 0)
      setQuota(res.quota || null)
    } catch (err) {
      message.error(`加载图床失败：${zhError(err)}`)
    } finally {
      setLoading(false)
    }
  }, [])

  // 挂载 + page/filters 变化时拉取
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await Promise.resolve() // 异步化，避免 effect 内同步 setState
      if (cancelled) return
      await loadImages(page, filters)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters])

  // 搜索：应用条件并回第一页
  const doSearch = () => {
    setLoading(true)
    setPage(1)
    setFilters({
      name: nameInput.trim(),
      start: dateRange?.[0]?.startOf('day').toISOString(),
      end: dateRange?.[1]?.endOf('day').toISOString(),
    })
  }

  // 重置：清空输入与条件
  const doReset = () => {
    setNameInput('')
    setDateRange(null)
    setLoading(true)
    setPage(1)
    setFilters({})
  }

  // 浏览器直传 OSS：用服务端签发的 policy + signature，图片不经过业务服务器
  const postFileToOss = (ticket, file) =>
    new Promise((resolve, reject) => {
      const form = new FormData()
      form.append('key', ticket.key)
      form.append('OSSAccessKeyId', ticket.accessKeyId)
      form.append('policy', ticket.policy)
      form.append('signature', ticket.signature)
      form.append('Content-Type', ticket.contentType)
      form.append('Content-Disposition', ticket.contentDisposition)
      form.append('Cache-Control', ticket.cacheControl)
      form.append('file', file)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', ticket.uploadUrl)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else reject(new Error(`OSS 上传失败（HTTP ${xhr.status}）`))
      }
      xhr.onerror = () => reject(new Error('OSS 上传网络错误'))
      xhr.send(form)
    })

  // 上传流程：快速校验 → 前端压缩 → 服务端票据（压缩后类型）→ 直传 OSS → 登记
  const beforeUpload = async (file) => {
    if (!ALLOWED_TYPES.has(file.type)) {
      message.error('仅支持 JPG / PNG / WebP / GIF')
      return Upload.LIST_IGNORE
    }
    if (file.size > MAX_RAW_SIZE_BYTES) {
      message.error(`${file.name} 超过 ${MAX_RAW_SIZE_MB}MB，无法处理`)
      return Upload.LIST_IGNORE
    }
    if (uploadingRef.current) {
      message.warning('已有图片在上传中，请稍候')
      return Upload.LIST_IGNORE
    }

    uploadingRef.current = true
    setUploading(true)
    setProgress(0)
    try {
      // 1. 前端压缩（GIF 原样；异常回退原文件）
      const { file: payload } = await compressImage(file)
      // 2. 申请票据（用压缩后的类型；配额/类型由服务端把关）
      const ticket = await cloud('imageHostUploadTicket', {
        contentType: payload.type,
      })
      if (payload.size > ticket.maxSize) {
        message.error(`${file.name} 压缩后仍超过 ${Math.round(ticket.maxSize / 1024 / 1024)}MB`)
        return Upload.LIST_IGNORE
      }
      // 3. 直传 OSS
      await postFileToOss(ticket, payload)
      // 4. 读压缩后尺寸 + 登记（name 保留原始文件名）
      const sizeMeta = await readImageSize(payload)
      await cloud('imageHostRegister', {
        key: ticket.key,
        token: ticket.token,
        name: file.name,
        ...sizeMeta,
      })
      message.success('上传成功')
      setProgress(100)
      if (page === 1) await loadImages(1, filters)
      else setPage(1) // 新图在最前，跳回第一页可见
    } catch (err) {
      message.error(`上传失败：${zhError(err)}`)
    } finally {
      uploadingRef.current = false
      setUploading(false)
    }
    return Upload.LIST_IGNORE
  }

  const handleDelete = async (item) => {
    try {
      await cloud('imageHostDelete', { id: item.id })
      message.success('已删除')
      if (images.length === 1 && page > 1)
        setPage(page - 1) // 本页删空则回上一页
      else await loadImages(page, filters)
    } catch (err) {
      message.error(`删除失败：${zhError(err)}`)
    }
  }

  return (
    <Card
      title={`图床（共 ${total} 张）`}
      extra={
        quota ? (
          <Tag color={quota.used >= quota.limit ? 'red' : 'blue'}>
            今日已上传 {quota.used}/{quota.limit} 张
          </Tag>
        ) : null
      }
      loading={loading}
    >
      <Upload.Dragger
        accept=".jpg,.jpeg,.png,.webp,.gif"
        showUploadList={false}
        multiple={false}
        maxCount={1}
        disabled={uploading}
        beforeUpload={beforeUpload}
        className={styles.dragger}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽图片到此处</p>
        <p className="ant-upload-hint">
          {uploading
            ? '正在上传，请稍候…'
            : 'JPG / PNG / WebP / GIF，上传前自动压缩（最长边 2048px，GIF 动画原样）'}
        </p>
      </Upload.Dragger>

      {uploading && <Progress percent={progress} className={styles.progress} />}

      <Space className={styles.filterBar} wrap>
        <Input
          placeholder="图片名称"
          prefix={<SearchOutlined />}
          allowClear
          className={styles.nameInput}
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onPressEnter={doSearch}
        />
        <DatePicker.RangePicker value={dateRange} onChange={setDateRange} />
        <Button type="primary" icon={<SearchOutlined />} onClick={doSearch}>
          搜索
        </Button>
        <Button icon={<ReloadOutlined />} onClick={doReset}>
          重置
        </Button>
      </Space>

      {images.length === 0 ? (
        <Empty description={hasSearch ? '未找到匹配的图片' : '还没有图片，上传第一张试试'} />
      ) : (
        <>
          <div className={styles.imageGrid}>
            {images.map((item) => (
              <ImageCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
          <div className={styles.pagerWrap}>
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={total}
              showSizeChanger={false}
              onChange={(p) => {
                setLoading(true)
                setPage(p)
              }}
            />
          </div>
        </>
      )}
    </Card>
  )
}
