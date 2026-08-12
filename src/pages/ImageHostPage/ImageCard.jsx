import { Card, Popconfirm, Button, Typography, message } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { CHECKER_BG, formatSize, formatMime, formatDate, formatDimensions } from '@/lib/imageMeta'

const { Text } = Typography

export const CARD_W = 250
const CARD_H = 322
const COVER_H = 150
const LINK_COLOR = '#1677ff'

const copyText = async (text, label) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success(`${label}已复制`)
  } catch {
    message.error('复制失败，请手动复制')
  }
}

export default function ImageCard({ item, onDelete }) {
  const name = item.name || item.key.split('/').pop()
  return (
    <Card
      size="small"
      style={{
        width: CARD_W,
        height: CARD_H,
        display: 'flex',
        flexDirection: 'column',
      }}
      styles={{ body: { padding: '12px 16px', flex: 1 } }}
      cover={
        <div style={{ position: 'relative', ...CHECKER_BG }}>
          <img
            src={item.url}
            alt={name}
            style={{
              height: COVER_H,
              width: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
          <Popconfirm title="确认删除这张图片？" onConfirm={() => onDelete(item)}>
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(255,255,255,0.9)',
              }}
            />
          </Popconfirm>
        </div>
      }
      actions={[
        <a key="url" style={{ color: LINK_COLOR }} onClick={() => copyText(item.url, '链接')}>
          原始URL
        </a>,
        <a
          key="md"
          style={{ color: LINK_COLOR }}
          onClick={() => copyText(`![${name}](${item.url})`, 'Markdown')}
        >
          Markdown
        </a>,
        <a
          key="html"
          style={{ color: LINK_COLOR }}
          onClick={() => copyText(`<img src="${item.url}" alt="${name}" />`, 'HTML')}
        >
          HTML
        </a>,
      ]}
    >
      <Text ellipsis style={{ display: 'block', fontSize: 16, marginBottom: 4 }}>
        {name}
      </Text>
      <Text type="secondary" style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>
        {formatMime(item.mime)} | {formatDate(item.createdAt)}
      </Text>
      <Text type="secondary" style={{ display: 'block', fontSize: 14 }}>
        {[formatSize(item.size), formatDimensions(item.width, item.height)]
          .filter(Boolean)
          .join(' | ')}
      </Text>
    </Card>
  )
}
