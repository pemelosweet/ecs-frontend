import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, Typography, message } from 'antd'
import { UserOutlined, LockOutlined, ReloadOutlined } from '@ant-design/icons'
import Parse from '@/lib/parse'
import { zhError } from '@/lib/errorMsg'

const { Title } = Typography

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [captcha, setCaptcha] = useState(null) // { captchaId, svg, width, height, pieceSize, y }
  const [slideX, setSlideX] = useState(0) // 滑块当前 x，拖到与缺口对齐
  const dragging = useRef(false)
  const boxRef = useRef(null)
  const navigate = useNavigate()

  // 拉取一张新滑块验证码
  const loadCaptcha = async () => {
    try {
      const res = await Parse.Cloud.run('captchaNew')
      setCaptcha(res)
      setSlideX(0)
    } catch (err) {
      message.error(`验证码加载失败：${zhError(err, '请刷新重试')}`)
    }
  }

  useEffect(() => {
    // 初次加载：拉验证码（setState 都在 await 后的回调里，不触碰同步 setState 规则）
    Parse.Cloud.run('captchaNew')
      .then(setCaptcha)
      .catch((err) => message.error(`验证码加载失败：${zhError(err, '请刷新重试')}`))
  }, [])

  // 拖拽滑块：指针按下/移动/抬起
  const onPointerDown = (e) => {
    dragging.current = true
    e.target.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!dragging.current || !captcha || !boxRef.current) return
    const rect = boxRef.current.getBoundingClientRect()
    const max = captcha.width - captcha.pieceSize
    setSlideX(Math.min(max, Math.max(0, e.clientX - rect.left - captcha.pieceSize / 2)))
  }
  const onPointerUp = () => {
    dragging.current = false
  }

  // 注册走 Cloud 函数：服务端先验滑块再建号（直接 /users 注册已被禁用）
  const onFinish = async (values) => {
    if (values.password !== values.confirm) {
      message.error('两次密码不一致')
      return
    }
    if (!captcha) {
      message.error('请等待验证码加载')
      return
    }
    setLoading(true)
    try {
      await Parse.Cloud.run('register', {
        username: values.username,
        password: values.password,
        captchaId: captcha.captchaId,
        x: slideX,
      })
      message.success('注册成功，请登录')
      navigate('/login', { replace: true })
    } catch (err) {
      message.error(zhError(err, '注册失败'))
      loadCaptcha() // 验证码一次性，失败后换一张
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fa',
      }}
    >
      <Card style={{ width: 400 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
          注册
        </Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码至少 8 位' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item
            name="confirm"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve()
                  return Promise.reject(new Error('两次密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" size="large" />
          </Form.Item>
          {/* 滑块验证码：拖白色滑块对齐图中缺口 */}
          <Form.Item label="安全验证">
            {captcha ? (
              <div
                ref={boxRef}
                style={{ width: captcha.width, position: 'relative', userSelect: 'none' }}
              >
                <img
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(captcha.svg)}`}
                  width={captcha.width}
                  height={captcha.height}
                  alt="滑块验证码"
                  draggable={false}
                  style={{ borderRadius: 6, display: 'block' }}
                />
                <div
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  style={{
                    position: 'absolute',
                    left: slideX,
                    top: captcha.y,
                    width: captcha.pieceSize,
                    height: captcha.pieceSize,
                    borderRadius: 6,
                    border: '2px solid #fff',
                    background: 'rgba(255,255,255,.45)',
                    cursor: 'grab',
                    touchAction: 'none',
                  }}
                />
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  style={{ position: 'absolute', right: 4, top: 4 }}
                  onClick={loadCaptcha}
                />
              </div>
            ) : (
              <div style={{ color: '#999' }}>验证码加载中…</div>
            )}
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              拖动白色滑块对齐图中缺口后提交
            </div>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              注册
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            已有账号？<Link to="/login">去登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  )
}
