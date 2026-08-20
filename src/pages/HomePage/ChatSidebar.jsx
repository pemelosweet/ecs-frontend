import { Button, Tooltip, Popconfirm } from 'antd'
import { PlusOutlined, MenuFoldOutlined, DeleteOutlined, MessageOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import styles from './index.module.less'

// 历史会话侧边栏：新建对话 / 收起 / 切换 / 删除（纯展示，状态由 HomePage 管理）
export default function ChatSidebar({ sessions, currentId, onNew, onOpen, onRemove, onToggle }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTop}>
        <Button icon={<PlusOutlined />} onClick={onNew} className={styles.newChatBtn}>
          新建对话
        </Button>
        <Tooltip title="收起侧边栏">
          <Button icon={<MenuFoldOutlined />} onClick={onToggle} className={styles.foldBtn} />
        </Tooltip>
      </div>
      <div className={styles.sessionList}>
        {sessions.length === 0 ? (
          <div className={styles.sessionEmpty}>暂无对话</div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className={s.id === currentId ? styles.sessionItemActive : styles.sessionItem}
              onClick={() => onOpen(s.id)}
            >
              <MessageOutlined className={styles.sessionIcon} />
              <div className={styles.sessionMeta}>
                <div className={styles.sessionTitle}>{s.title}</div>
                <div className={styles.sessionTime}>{dayjs(s.updatedAt).format('MM-DD HH:mm')}</div>
              </div>
              <Popconfirm
                title="删除该对话？"
                okText="删除"
                cancelText="取消"
                onConfirm={() => onRemove(s.id)}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  className={styles.sessionDel}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
