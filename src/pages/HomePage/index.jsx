import { useState, useRef, useEffect } from 'react'
import { Input, Button, Avatar, Tag, Tooltip, Modal } from 'antd'
import {
  RobotOutlined,
  SendOutlined,
  UserOutlined,
  BulbOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Parse from '@/lib/parse'
import { zhError } from '@/lib/errorMsg'

// 建议问题（空状态展示，点击直接提问）
const SUGGESTIONS = [
  { icon: '🚀', text: '前端页面加载慢，有哪些优化手段？' },
  { icon: '⚛️', text: 'React 状态管理应该怎么选？' },
  { icon: '🗄️', text: '数据库索引怎么设计才高效？' },
  { icon: '🔐', text: '前后端接口鉴权的最佳实践？' },
]

// 聊天头像：AI 用机器人图标，用户用名字首字
const AssistantAvatar = () => (
  <Avatar
    size={36}
    icon={<RobotOutlined />}
    style={{ background: 'linear-gradient(135deg, #2f54eb, #6b5bff)', flexShrink: 0 }}
  />
)

// 参考来源按文档去重：同文档多块合并为「标题 ×n」，点击标签弹窗查看各召回块
const groupSources = (sources) => {
  const map = new Map()
  for (const s of sources || []) {
    const title = s.title || '未命名文档'
    if (!map.has(title)) map.set(title, { title, count: 0, contents: [] })
    const g = map.get(title)
    g.count += 1
    if (s.content) g.contents.push(s.content)
  }
  return [...map.values()]
}

export default function HomePage() {
  const [messages, setMessages] = useState([]) // { id, role: 'user'|'assistant', content, sources?, error? }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sourcesModal, setSourcesModal] = useState(null) // { title, chunks: [{ path, body }] }
  const listRef = useRef(null)

  // 消息/加载态变化时滚动到底部（jsdom 测试环境无 scrollTo，用可选调用兜底）
  useEffect(() => {
    const el = listRef.current
    el?.scrollTo?.({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const question = String(text ?? input).trim()
    if (!question || loading) return

    setMessages((m) => [...m, { id: Date.now(), role: 'user', content: question }])
    setInput('')
    setLoading(true)
    try {
      const res = await Parse.Cloud.run('askKnowledge', { question })
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: res?.answer || '（空回答）',
          sources: res?.sources || [],
        },
      ])
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: `抱歉，本次问答未能完成。\n\n> ${zhError(err, '服务暂不可用，请稍后重试')}`,
          error: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 150px)' }}>
      {/* ===== 消息滚动区 ===== */}
      <div
        ref={listRef}
        style={{ flex: 1, overflowY: 'auto', padding: '8px 4px 24px', scrollbarWidth: 'thin' }}
      >
        {isEmpty ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 28,
              paddingBottom: 40,
            }}
          >
            {/* 欢迎标题 */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  margin: '0 auto 20px',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 34,
                  color: '#fff',
                  background: 'linear-gradient(135deg, #2f54eb, #6b5bff)',
                  boxShadow: '0 12px 32px rgba(47, 84, 235, 0.35)',
                }}
              >
                <RobotOutlined />
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #0f172a, #2f54eb)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  letterSpacing: 0.5,
                }}
              >
                你好，我是知识库助手
              </div>
              <div style={{ marginTop: 10, color: '#64748b', fontSize: 15 }}>
                基于你的知识库回答，回答可溯源，宁缺毋滥
              </div>
            </div>

            {/* 建议问题 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 14,
                width: '100%',
                maxWidth: 760,
              }}
            >
              {SUGGESTIONS.map((s) => (
                <div
                  key={s.text}
                  onClick={() => send(s.text)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '16px 18px',
                    background: '#fff',
                    border: '1px solid #e5e9f0',
                    borderRadius: 14,
                    cursor: 'pointer',
                    color: '#0f172a',
                    fontSize: 14,
                    fontWeight: 500,
                    transition: 'all .2s ease',
                    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2f54eb'
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(47,84,235,0.14)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e9f0'
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <span>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              maxWidth: 860,
              margin: '0 auto',
            }}
          >
            {messages.map((msg) =>
              msg.role === 'user' ? (
                /* ===== 用户气泡（右侧） ===== */
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <div
                    style={{
                      maxWidth: '72%',
                      padding: '12px 16px',
                      borderRadius: '16px 4px 16px 16px',
                      background: 'linear-gradient(135deg, #2f54eb, #3f6bff)',
                      color: '#fff',
                      fontSize: 14,
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      boxShadow: '0 4px 14px rgba(47,84,235,0.25)',
                    }}
                  >
                    {msg.content}
                  </div>
                  <Avatar
                    size={36}
                    icon={<UserOutlined />}
                    style={{ background: '#cbd5e1', flexShrink: 0 }}
                  />
                </div>
              ) : (
                /* ===== AI 气泡（左侧） ===== */
                <div key={msg.id} style={{ display: 'flex', gap: 10 }}>
                  <AssistantAvatar />
                  <div
                    style={{
                      maxWidth: '82%',
                      padding: '14px 18px',
                      borderRadius: '4px 16px 16px 16px',
                      background: '#fff',
                      border: '1px solid #e5e9f0',
                      boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                    }}
                  >
                    {loading && msg.id === messages[messages.length - 1]?.id ? (
                      <div className="typing-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : (
                      <div
                        className="md-content"
                        style={{ fontSize: 14, lineHeight: 1.8, color: '#1e293b' }}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    )}

                    {/* 引用来源 */}
                    {msg.sources?.length > 0 && (
                      <div
                        style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e5e9f0' }}
                      >
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                          参考来源
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {groupSources(msg.sources).map((g) => (
                            <Tag
                              key={g.title}
                              icon={<FileTextOutlined />}
                              color="blue"
                              style={{ marginInlineEnd: 0, cursor: 'pointer', maxWidth: 260 }}
                              onClick={() =>
                                setSourcesModal({
                                  title: g.title,
                                  chunks: g.contents.map((c) => {
                                    // 切块首行是标题路径（切块时附加），拆开展示更清晰
                                    const idx = c.indexOf('\n')
                                    return idx > -1
                                      ? { path: c.slice(0, idx), body: c.slice(idx + 1) }
                                      : { path: '', body: c }
                                  }),
                                })
                              }
                            >
                              <span
                                style={{
                                  maxWidth: 200,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: 'inline-block',
                                  verticalAlign: 'bottom',
                                }}
                              >
                                {g.title}
                                {g.count > 1 ? ` ×${g.count}` : ''}
                              </span>
                            </Tag>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ===== 输入区 ===== */}
      <div style={{ paddingTop: 8, borderTop: '1px solid #eef1f6' }}>
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
            background: '#fff',
            border: '1px solid #e5e9f0',
            borderRadius: 16,
            padding: '10px 12px',
            boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
            transition: 'box-shadow .2s ease, border-color .2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#b9c4f5')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e9f0')}
        >
          <Input.TextArea
            autoSize={{ minRows: 1, maxRows: 5 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="输入你的问题，回车发送，Shift+回车换行…"
            variant="borderless"
            style={{ fontSize: 14, padding: '4px 0' }}
          />
          <Tooltip title="发送">
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<SendOutlined />}
              disabled={!input.trim() || loading}
              onClick={() => send()}
              style={{
                background: 'linear-gradient(135deg, #2f54eb, #6b5bff)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(47,84,235,0.3)',
              }}
            />
          </Tooltip>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#c0c8d6', marginTop: 8 }}>
          <BulbOutlined /> 内容由 AI 生成，请结合引用来源核对
        </div>
      </div>

      {/* 引用来源详情：点击标签查看该文档各召回块（标题路径 + Markdown 正文） */}
      <Modal
        title={`引用来源：${sourcesModal?.title || ''}（${sourcesModal?.chunks.length || 0} 块）`}
        open={!!sourcesModal}
        onCancel={() => setSourcesModal(null)}
        footer={null}
        width={640}
      >
        {sourcesModal?.chunks.map((c, i) => (
          <div
            key={i}
            style={{
              marginBottom: 16,
              padding: 12,
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #eef1f6',
            }}
          >
            {c.path && (
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{c.path}</div>
            )}
            <div className="md-content" style={{ fontSize: 13, lineHeight: 1.7 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.body}</ReactMarkdown>
            </div>
          </div>
        ))}
      </Modal>
    </div>
  )
}
