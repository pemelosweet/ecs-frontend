import { Card, Typography } from 'antd'

const { Title, Paragraph } = Typography

export default function HomePage() {
  return (
    <Card>
      <Typography>
        <Title level={3}>欢迎使用管理系统</Title>
        <Paragraph>
          这是一个前后端分离的示例项目：前端 React + Ant Design，后端 FastAPI + SQLite。
        </Paragraph>
      </Typography>
    </Card>
  )
}
