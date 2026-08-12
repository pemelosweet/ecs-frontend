import { useState, useEffect } from 'react'
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
} from 'antd'
import { InboxOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import Parse from '@/lib/parse'
import { zhError } from '@/lib/errorMsg'
import ImageCard, { CARD_W } from './ImageCard'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_SIZE_MB = 10
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const PAGE_SIZE = 12

// 本地读取图片宽高（登记时随传，展示用）；读取失败不阻断上传
const readImageSize = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const meta = { width: img.naturalWidth, height: img.naturalHeight }
      URL.revokeObjectURL(url)
      resolve(meta)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({})
    }
    img.src = url
  })

export default function ImageHostPage() {
  const [images, setImages] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [nameInput, setNameInput] = useState('') // 搜索框输入（未应用）
  const [dateRange, setDateRange] = useState(null) // 日期范围选择（未应用）
  const [filters, setFilters] = useState({}) // 已应用的搜索条件 { name, start, end }

  // 组装列表查询参数（分页 + 搜索条件）
  const buildParams = (p, f) => {
    const params = { limit: PAGE_SIZE, skip: (p - 1) * PAGE_SIZE }
    if (f.name) params.name = f.name
    if (f.start) params.startDate = f.start
    if (f.end) params.endDate = f.end
    return params
  }

  const loadImages = async (p, f = filters) => {
    setLoading(true)
    try {
      const res = await Parse.Cloud.run('imageHostList', buildParams(p, f))
      setImages(res.results || [])
      setTotal(res.total || 0)
    } catch (err) {
      message.error(`加载图床失败：${zhError(err)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // setState 都在异步回调里，不触碰同步 setState 规则
    Parse.Cloud.run('imageHostList', buildParams(page, filters))
      .then((res) => {
        setImages(res.results || [])
        setTotal(res.total || 0)
      })
      .catch((err) => message.error(`加载图床失败：${zhError(err)}`))
      .finally(() => setLoading(false))
  }, [page, filters])

  // 搜索：应用条件并回第一页（filters 新对象触发 effect 重拉）
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

  const beforeUpload = async (file) => {
    if (!ALLOWED_TYPES.has(file.type)) {
      message.error('仅支持 JPG / PNG / WebP / GIF')
      return Upload.LIST_IGNORE
    }
    if (file.size > MAX_SIZE_BYTES) {
      message.error(`${file.name} 超过 ${MAX_SIZE_MB}MB`)
      return Upload.LIST_IGNORE
    }

    setUploading(true)
    setProgress(0)
    try {
      const ticket = await Parse.Cloud.run('imageHostUploadTicket', { contentType: file.type })
      await postFileToOss(ticket, file)
      const sizeMeta = await readImageSize(file)
      await Parse.Cloud.run('imageHostRegister', {
        key: ticket.key,
        token: ticket.token,
        name: file.name,
        ...sizeMeta,
      })
      message.success('上传成功')
      if (page === 1) await loadImages(1)
      else setPage(1) // 新图在最前，跳回第一页可见
    } catch (err) {
      message.error(`上传失败：${zhError(err)}`)
    } finally {
      setUploading(false)
    }
    return Upload.LIST_IGNORE
  }

  const handleDelete = async (item) => {
    try {
      await Parse.Cloud.run('imageHostDelete', { id: item.id })
      message.success('已删除')
      if (images.length === 1 && page > 1)
        setPage(page - 1) // 本页删空则回上一页
      else await loadImages(page)
    } catch (err) {
      message.error(`删除失败：${zhError(err)}`)
    }
  }

  return (
    <Card title={`图床（共 ${total} 张）`} loading={loading}>
      <Upload.Dragger
        accept=".jpg,.jpeg,.png,.webp,.gif"
        showUploadList={false}
        multiple={false}
        disabled={uploading}
        beforeUpload={beforeUpload}
        style={{ marginBottom: 24 }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽图片到此处</p>
        <p className="ant-upload-hint">JPG / PNG / WebP / GIF，不超过 {MAX_SIZE_MB}MB</p>
      </Upload.Dragger>

      {uploading && <Progress percent={progress} style={{ marginBottom: 24 }} />}

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="图片名称"
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 200 }}
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
        <Empty description="还没有图片，上传第一张试试" />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, ${CARD_W}px)`,
              gap: 16,
            }}
          >
            {images.map((item) => (
              <ImageCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
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
