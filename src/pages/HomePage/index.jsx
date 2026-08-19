import { useState, useRef, useEffect } from 'react'
import { Input, Button, Avatar, Tag, Tooltip, Modal } from 'antd'
import { SendOutlined, UserOutlined, ReadOutlined, FileTextOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cloud } from '@/lib/request'
import { zhError } from '@/lib/errorMsg'
import styles from './index.module.less'

// 聊天头像：助手用书本图标（知识库检索定位，弱化 AI 人设），用户用名字首字
const AssistantAvatar = () => (
  <Avatar size={36} icon={<ReadOutlined />} className={styles.assistantAvatar} />
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
      const res = await cloud('askKnowledge', { question })
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
    <div className={styles.page}>
      {/* ===== 消息滚动区 ===== */}
      <div ref={listRef} className={styles.messageList}>
        {isEmpty ? (
          <div className={styles.empty}>
            <div className={styles.emptyInner}>
              <div className={styles.emptyTitle}>知识库问答</div>
              <div className={styles.emptyDesc}>
                输入问题，从已上传的文档中检索答案，结论均附引用来源
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((msg) =>
              msg.role === 'user' ? (
                /* ===== 用户气泡（右侧） ===== */
                <div key={msg.id} className={styles.userRow}>
                  <div className={styles.userBubble}>{msg.content}</div>
                  <Avatar size={36} icon={<UserOutlined />} className={styles.userAvatar} />
                </div>
              ) : (
                /* ===== AI 气泡（左侧） ===== */
                <div key={msg.id} className={styles.assistantRow}>
                  <AssistantAvatar />
                  <div className={styles.assistantBubble}>
                    {loading && msg.id === messages[messages.length - 1]?.id ? (
                      <div className="typing-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : (
                      <div className={`md-content ${styles.mdBody}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    )}

                    {/* 引用来源 */}
                    {msg.sources?.length > 0 && (
                      <div className={styles.sources}>
                        <div className={styles.sourcesLabel}>参考来源</div>
                        <div className={styles.sourcesTags}>
                          {groupSources(msg.sources).map((g) => (
                            <Tag
                              key={g.title}
                              icon={<FileTextOutlined />}
                              color="blue"
                              className={styles.sourceTag}
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
                              <span className={styles.sourceTagText}>
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
      <div className={styles.composer}>
        <div className={styles.composerBox}>
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
            placeholder="输入问题，回车发送"
            variant="borderless"
            className={styles.composerInput}
          />
          <Tooltip title="发送">
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<SendOutlined />}
              disabled={!input.trim() || loading}
              onClick={() => send()}
            />
          </Tooltip>
        </div>
        <div className={styles.disclaimer}>答案检索自知识库文档，请结合引用来源核对</div>
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
          <div key={i} className={styles.chunkCard}>
            {c.path && <div className={styles.chunkPath}>{c.path}</div>}
            <div className={`md-content ${styles.chunkBody}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.body}</ReactMarkdown>
            </div>
          </div>
        ))}
      </Modal>
    </div>
  )
}
