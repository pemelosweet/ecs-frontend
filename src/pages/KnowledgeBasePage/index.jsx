import { useState, useEffect, useCallback } from 'react'
import { Card, Upload, Table, Tag, Button, Popconfirm, Empty, Drawer, message } from 'antd'
import { InboxOutlined, DeleteOutlined, DownloadOutlined, ProfileOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import Parse from '@/lib/parse'
import { zhError } from '@/lib/errorMsg'

const ACCEPT_TYPES = '.pdf,.docx,.txt,.md,.markdown,.xlsx'
const PAGE_SIZE = 10

const MIME_LABELS = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'text/plain': 'TXT',
  'text/markdown': 'MD',
}

const formatMime = (mime) => {
  if (!mime) return '未知'
  return MIME_LABELS[mime] || mime.split('/')[1]?.toUpperCase() || mime
}

export default function KnowledgeBasePage() {
  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [page, setPage] = useState(1)
  const [chunksDoc, setChunksDoc] = useState(null) // 当前查看切块的文档
  const [chunksList, setChunksList] = useState([])
  const [chunksLoading, setChunksLoading] = useState(false)

  const loadList = useCallback(async (p) => {
    setLoading(true)
    try {
      const res = await Parse.Cloud.run('knowledgeList', { page: p, pageSize: PAGE_SIZE })
      setList(res.list || [])
      setTotal(res.total || 0)
    } catch (err) {
      message.error(zhError(err, '加载知识库失败'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await Promise.resolve()
      if (!cancelled) await loadList(1)
    })()
    return () => {
      cancelled = true
    }
  }, [loadList])

  const beforeUpload = async (file) => {
    setUploading(true)
    try {
      // Parse.File 的 name 会进入文件 URL，只能用 ASCII 安全字符（中文/% 都会被拒）；
      // 用随机名 + 保留扩展名，原始文件名作为 title 传给后端
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      const safeExt = /^[a-z0-9]+$/.test(ext) ? `.${ext}` : ''
      const safeName = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`
      const pf = new Parse.File(safeName, file)
      await pf.save()
      const res = await Parse.Cloud.run('knowledgeUpload', {
        file: pf,
        title: file.name,
        mimeType: file.type,
      })
      message.success(`已入库「${file.name}」，切分为 ${res.chunkCount} 块`)
      await loadList(1)
    } catch (err) {
      message.error(zhError(err, '上传失败'))
    } finally {
      setUploading(false)
    }
    return Upload.LIST_IGNORE
  }

  const handleDelete = async (record) => {
    try {
      await Parse.Cloud.run('knowledgeDelete', { id: record.id })
      message.success(`已删除「${record.title}」`)
      const nextPage = list.length === 1 && page > 1 ? page - 1 : page
      await loadList(nextPage)
    } catch (err) {
      message.error(zhError(err, '删除失败'))
    }
  }

  const handleViewChunks = async (record) => {
    setChunksDoc(record)
    setChunksList([])
    setChunksLoading(true)
    try {
      const res = await Parse.Cloud.run('knowledgeChunks', { id: record.id })
      setChunksList(res.list || [])
    } catch (err) {
      message.error(zhError(err, '加载切块失败'))
    } finally {
      setChunksLoading(false)
    }
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'mimeType',
      key: 'mimeType',
      width: 90,
      render: (m) => <Tag>{formatMime(m)}</Tag>,
    },
    {
      title: '切块数',
      dataIndex: 'chunkCount',
      key: 'chunkCount',
      width: 90,
      align: 'center',
      render: (n) => n || 0,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s) =>
        s === 'ready' ? <Tag color="green">就绪</Tag> : <Tag color="orange">处理中</Tag>,
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 210,
      render: (_, record) => (
        <>
          <Button
            type="link"
            size="small"
            icon={<ProfileOutlined />}
            onClick={() => handleViewChunks(record)}
          >
            切块
          </Button>
          {/* 早期入库的文档未存原始文件引用，无下载入口 */}
          {record.fileUrl && (
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              href={record.fileUrl}
              download={record.fileName || record.title}
            >
              下载
            </Button>
          )}
          <Popconfirm
            title="确认删除该文档？"
            description="删除后其所有切块一并移除，不可恢复"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ]

  return (
    <Card title={`知识库（共 ${total} 篇）`}>
      <Upload.Dragger
        accept={ACCEPT_TYPES}
        showUploadList={false}
        multiple={false}
        disabled={uploading}
        beforeUpload={beforeUpload}
        style={{ marginBottom: 24 }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          {uploading ? '正在解析入库，请稍候…' : '点击或拖拽文档到此处'}
        </p>
        <p className="ant-upload-hint">
          支持 PDF / Word / Excel / TXT / Markdown，上传后自动解析切块
        </p>
      </Upload.Dragger>

      {list.length === 0 && !loading ? (
        <Empty description="还没有文档，上传第一篇知识库文档吧" />
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showTotal: (t) => `共 ${t} 篇`,
            onChange: (p) => {
              setPage(p)
              loadList(p)
            },
          }}
        />
      )}

      {/* 切块查看抽屉：验证切块质量 / 排查召回问题 */}
      <Drawer
        title={`切块预览：${chunksDoc?.title || ''}（共 ${chunksList.length} 块）`}
        open={!!chunksDoc}
        onClose={() => setChunksDoc(null)}
        width={560}
      >
        {chunksLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>加载中…</div>
        ) : (
          chunksList.map((c) => (
            <div
              key={c.id}
              style={{
                marginBottom: 16,
                padding: 12,
                background: '#f8fafc',
                borderRadius: 8,
                border: '1px solid #eef1f6',
              }}
            >
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                块 {c.chunkIndex + 1} ｜ {c.content.length} 字 ｜ 约 {c.tokenCount} token
              </div>
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: '#1e293b',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {c.content}
              </div>
            </div>
          ))
        )}
      </Drawer>
    </Card>
  )
}
