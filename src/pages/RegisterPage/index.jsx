import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, Typography, message, Space } from 'antd'
import { UserOutlined, LockOutlined, MobileOutlined, SafetyOutlined } from '@ant-design/icons'
import { cloud } from '@/lib/request'
import { zhError } from '@/lib/errorMsg'
import styles from './index.module.less'

const { Title } = Typography

// 图形认证方案 appId（号码认证控制台 > 图形认证方案管理 获取；非机密，前端可见）
const GRAPHIC_CAPTCHA_APP_ID = 'aa2c323d207de88c6219f173f088db50'
// 图形认证开关：临时停用（false），恢复时置 true 并同步后端 cloud/main.js 的 GRAPHIC_CAPTCHA_ENABLED
const GRAPHIC_CAPTCHA_ENABLED = false

// 模块级单例：防 React StrictMode 双挂载导致 SDK 重复初始化
let captchaInstance = null

export default function RegisterPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0) // 短信重发倒计时（秒）
  const [smsLoading, setSmsLoading] = useState(false)
  const [captchaReady, setCaptchaReady] = useState(!!captchaInstance)
  const captchaRef = useRef(captchaInstance)
  const navigate = useNavigate()

  // 倒计时：每秒减 1（setState 在 setTimeout 回调里，不触碰同步 setState 规则）
  useEffect(() => {
    if (countdown <= 0) return undefined
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // 发送短信验证码：先校验手机号字段，成功后 60 秒内不可重发
  const sendSms = async () => {
    let phone
    try {
      ;({ phone } = await form.validateFields(['phone']))
    } catch {
      return // 表单校验未过，错误已内联提示
    }
    setSmsLoading(true)
    try {
      await cloud('smsSend', { phone })
      setCountdown(60)
      message.success('验证码已发送，5 分钟内有效')
    } catch (err) {
      message.error(zhError(err, '发送失败，请稍后重试'))
    } finally {
      setSmsLoading(false)
    }
  }

  // 图形认证通过后：四要素随表单数据交 register，服务端二次校验 + 短信核验后建号
  // 图形认证停用时 v 为空对象，不传四要素
  const doRegister = async (v = {}) => {
    const values = form.getFieldsValue()
    setLoading(true)
    try {
      await cloud('register', {
        username: values.username,
        password: values.password,
        phone: values.phone,
        smsCode: values.smsCode,
        ...(GRAPHIC_CAPTCHA_ENABLED
          ? {
              lot_number: v.lot_number,
              captcha_output: v.captcha_output,
              pass_token: v.pass_token,
              gen_time: v.gen_time,
            }
          : {}),
      })
      message.success('注册成功，请登录')
      navigate('/login', { replace: true })
    } catch (err) {
      message.error(zhError(err, '注册失败'))
      if (GRAPHIC_CAPTCHA_ENABLED) captchaRef.current?.reset() // 业务失败（如用户名被占用）需重新完成验证
    } finally {
      setLoading(false)
    }
  }

  // 初始化图形认证 SDK（ct4.js 由 index.html 引入，需自托管在 public/ct4.js）
  useEffect(() => {
    if (!GRAPHIC_CAPTCHA_ENABLED) return undefined // 图形认证临时停用
    if (captchaInstance) return undefined // 已初始化过（StrictMode 双挂载防护）
    if (typeof window.initAlicom4 !== 'function') {
      message.error('验证码 SDK 未加载，请刷新重试')
      return undefined
    }
    window.initAlicom4(
      { captchaId: GRAPHIC_CAPTCHA_APP_ID, product: 'bind', language: 'zho' },
      (captchaObj) => {
        captchaInstance = captchaObj
        captchaRef.current = captchaObj
        captchaObj.onNextReady(() => setCaptchaReady(true))
        captchaObj.onSuccess(() => {
          const v = captchaObj.getValidate()
          if (v) doRegister(v)
        })
        captchaObj.onFail(() => message.error('人机验证未通过，请重试'))
        captchaObj.onError(() => message.error('验证码服务异常，请稍后重试'))
        captchaObj.onClose(() => message.info('验证已关闭，通过验证后才能注册'))
      }
    )
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 点注册：先校验表单；图形认证开启时再调起验证弹窗，验证通过自动走 doRegister
  const onSubmit = async () => {
    try {
      await form.validateFields()
    } catch {
      return
    }
    if (!GRAPHIC_CAPTCHA_ENABLED) {
      doRegister()
      return
    }
    if (!captchaRef.current || !captchaReady) {
      message.error('验证码加载中，请稍候再试')
      return
    }
    captchaRef.current.showCaptcha()
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <Title level={3} className={styles.title}>
          注册
        </Title>
        <Form form={form} layout="vertical">
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
          <Form.Item>
            <Space.Compact className={styles.phoneRow}>
              <Form.Item
                name="phone"
                noStyle
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1\d{10}$/, message: '手机号格式错误' },
                ]}
              >
                <Input
                  prefix={<MobileOutlined />}
                  placeholder="手机号"
                  size="large"
                  maxLength={11}
                />
              </Form.Item>
              <Button
                size="large"
                onClick={sendSms}
                loading={smsLoading}
                disabled={countdown > 0}
                className={styles.smsBtn}
              >
                {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item
            name="smsCode"
            rules={[
              { required: true, message: '请输入短信验证码' },
              { pattern: /^\d{6}$/, message: '验证码为 6 位数字' },
            ]}
          >
            <Input
              prefix={<SafetyOutlined />}
              placeholder="短信验证码"
              size="large"
              maxLength={6}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" loading={loading} block size="large" onClick={onSubmit}>
              注册
            </Button>
          </Form.Item>
          <div className={styles.footerLink}>
            已有账号？<Link to="/login">去登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  )
}
