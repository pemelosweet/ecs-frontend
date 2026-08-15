import { Card, Popconfirm, Button, Typography, message, Image } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { CHECKER_BG, formatSize, formatMime, formatDate, formatDimensions } from '@/lib/imageMeta'

const { Text } = Typography

export const CARD_W = 250
const CARD_H = 322
const COVER_H = 150

// 图片加载失败占位（内联 SVG data URI，不依赖外部资源）
const FALLBACK_IMG =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="250" height="150">' +
      '<rect width="100%" height="100%" fill="#f5f5f5"/>' +
      '<text x="50%" y="50%" fill="#bfbfbf" font-size="14" text-anchor="middle" dominant-baseline="middle">图片加载失败</text>' +
      '</svg>'
  )

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
          <Image
            src={item.url}
            alt={name}
            height={COVER_H}
            width="100%"
            style={{ objectFit: 'contain', display: 'block' }}
            fallback={FALLBACK_IMG}
            preview={{ mask: '点击预览' }}
          />
          <Popconfirm title="确认删除这张图片？" onConfirm={() => onDelete(item)}>
            <Button
              size="small"
              type="text"
              danger
              aria-label={`删除图片 ${name}`}
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
        <Button key="url" type="link" size="small" onClick={() => copyText(item.url, '链接')}>
          原始URL
        </Button>,
        <Button
          key="md"
          type="link"
          size="small"
          onClick={() => copyText(`![${name}](${item.url})`, 'Markdown')}
        >
          Markdown
        </Button>,
        <Button
          key="html"
          type="link"
          size="small"
          onClick={() => copyText(`<img src="${item.url}" alt="${name}" />`, 'HTML')}
        >
          HTML
        </Button>,
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
