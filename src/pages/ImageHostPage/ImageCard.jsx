import { Card, Popconfirm, Button, Typography, message, Image } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { formatSize, formatMime, formatDate, formatDimensions } from '@/lib/imageMeta'
import styles from './ImageCard.module.less'

const { Text } = Typography

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
      className={styles.card}
      cover={
        <div className={styles.cover}>
          <Image
            src={item.url}
            alt={name}
            height={COVER_H}
            width="100%"
            className={styles.coverImg}
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
              className={styles.deleteBtn}
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
      <Text ellipsis className={styles.cardName}>
        {name}
      </Text>
      <Text type="secondary" className={styles.cardMeta}>
        {formatMime(item.mime)} | {formatDate(item.createdAt)}
      </Text>
      <Text type="secondary" className={styles.cardMetaLast}>
        {[formatSize(item.size), formatDimensions(item.width, item.height)]
          .filter(Boolean)
          .join(' | ')}
      </Text>
    </Card>
  )
}
