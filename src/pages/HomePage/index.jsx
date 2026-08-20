import { useState, useRef, useEffect } from 'react'
import { Input, Button, Avatar, Tag, Tooltip, Modal, message } from 'antd'
import {
  SendOutlined,
  UserOutlined,
  ReadOutlined,
  FileTextOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Parse from '@/lib/parse'
import { cloud } from '@/lib/request'
import { zhError } from '@/lib/errorMsg'
import ChatSidebar from './ChatSidebar'
import styles from './index.module.less'

// 侧边栏折叠状态持久化
const COLLAPSED_KEY = 'kb-chat-sidebar-collapsed'
// 会话标题取首问前 N 字
const TITLE_MAX = 30

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
  // 历史会话：列表 + 当前会话 id + 侧边栏折叠态
  const [sessions, setSessions] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1')
  const listRef = useRef(null)

  // 消息/加载态变化时滚动到底部（jsdom 测试环境无 scrollTo，用可选调用兜底）
  useEffect(() => {
    const el = listRef.current
    el?.scrollTo?.({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  // 会话列表（只取摘要字段，按更新时间倒序）
  const loadSessions = async () => {
    const q = new Parse.Query('ChatSession')
    q.select('title', 'updatedAt')
    q.descending('updatedAt')
    q.limit(50)
    const list = await q.find()
    return list.map((s) => ({ id: s.id, title: s.get('title'), updatedAt: s.get('updatedAt') }))
  }

  // 初始加载：setState 放在 then 回调（符合 effect 订阅模式，避免级联渲染）
  useEffect(() => {
    loadSessions()
      .then(setSessions)
      .catch(() => {}) // 加载失败静默降级，不影响问答
  }, [])

  // 持久化一轮问答：已有会话追加，否则新建（ACL 限当前用户读写）
  const persistRound = async (question, full) => {
    try {
      const store = full.map((m) => ({
        role: m.role,
        content: m.content,
        sources: m.sources || [],
        error: !!m.error,
        at: m.id,
      }))
      if (currentId) {
        const o = Parse.Object.createWithoutData('ChatSession', currentId)
        o.set('messages', store)
        await o.save()
      } else {
        const o = new Parse.Object('ChatSession')
        o.set('title', question.slice(0, TITLE_MAX))
        o.set('messages', store)
        o.setACL(new Parse.ACL(Parse.User.current()))
        await o.save()
        setCurrentId(o.id)
      }
      loadSessions()
        .then(setSessions)
        .catch(() => {}) // 刷新列表（标题/更新时间/排序）
    } catch (err) {
      message.error(zhError(err, '对话历史保存失败'))
    }
  }

  const send = async (text) => {
    const question = String(text ?? input).trim()
    if (!question || loading) return

    const userMsg = { id: Date.now(), role: 'user', content: question }
    let assistantMsg
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await cloud('askKnowledge', { question })
      assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res?.answer || '（空回答）',
        sources: res?.sources || [],
      }
    } catch (err) {
      assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `抱歉，本次问答未能完成。\n\n> ${zhError(err, '服务暂不可用，请稍后重试')}`,
        error: true,
      }
    } finally {
      setLoading(false)
    }
    setMessages((m) => [...m, assistantMsg])
    await persistRound(question, [...messages, userMsg, assistantMsg])
  }

  // 切换历史会话：拉取完整消息
  const openSession = async (id) => {
    if (id === currentId || loading) return
    try {
      const o = await new Parse.Query('ChatSession').get(id)
      setMessages((o.get('messages') || []).map((m, i) => ({ ...m, id: m.at || i })))
      setCurrentId(id)
    } catch (err) {
      message.error(zhError(err, '加载对话失败'))
    }
  }

  // 新建对话：回到空状态（不立即建会话，首问发送时才落库）
  const newChat = () => {
    if (loading) return
    setCurrentId(null)
    setMessages([])
  }

  const removeSession = async (id) => {
    try {
      await Parse.Object.createWithoutData('ChatSession', id).destroy()
      setSessions((list) => list.filter((s) => s.id !== id))
      if (currentId === id) newChat()
    } catch (err) {
      message.error(zhError(err, '删除失败'))
    }
  }

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1')
      return !c
    })
  }

  const isEmpty = messages.length === 0

  return (
    <div className={styles.page}>
      {/* ===== 历史会话侧边栏 ===== */}
      {!collapsed && (
        <ChatSidebar
          sessions={sessions}
          currentId={currentId}
          onNew={newChat}
          onOpen={openSession}
          onRemove={removeSession}
          onToggle={toggleCollapsed}
        />
      )}

      {/* ===== 主聊天区 ===== */}
      <div className={styles.main}>
        {collapsed && (
          <Tooltip title="展开侧边栏">
            <Button
              type="text"
              icon={<MenuUnfoldOutlined />}
              onClick={toggleCollapsed}
              className={styles.unfoldBtn}
            />
          </Tooltip>
        )}

        {/* 消息滚动区 */}
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

        {/* 输入区 */}
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
