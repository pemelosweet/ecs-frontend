import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, Typography, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import Parse from '@/lib/parse'
import { zhError } from '@/lib/errorMsg'
import { clearMenuCache } from '@/lib/permissions'
import ForgotPasswordModal from './ForgotPasswordModal'
import styles from './index.module.less'

const { Title } = Typography

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values) => {
    setLoading(true)
    try {
      await Parse.User.logIn(values.username, values.password)
      clearMenuCache() // 切换账号后强制重新拉取权限
      message.success('登录成功')
      navigate('/home', { replace: true })
    } catch (err) {
      message.error(zhError(err, '登录失败'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <Title level={3} className={styles.title}>
          登录
        </Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登录
            </Button>
          </Form.Item>
          <div className={styles.footerRow}>
            <a onClick={() => setForgotOpen(true)}>忘记密码？</a>
            <span>
              还没有账号？<Link to="/register">立即注册</Link>
            </span>
          </div>
        </Form>
      </Card>
      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  )
}
