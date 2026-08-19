import { useState, useEffect } from 'react'
import { Modal, Form, Input, Button, Space, message } from 'antd'
import { UserOutlined, LockOutlined, MobileOutlined, SafetyOutlined } from '@ant-design/icons'
import { cloud } from '@/lib/request'
import { zhError } from '@/lib/errorMsg'
import styles from './ForgotPasswordModal.module.less'

// 忘记密码弹窗：单屏表单（账号 + 验证码 + 新密码一次填完）
// 服务端入口：resetPasswordSmsSend（username+phone 匹配才发码）、resetPassword（校验码+改密）
export default function ForgotPasswordModal({ open, onClose }) {
  const [form] = Form.useForm()
  const [sending, setSending] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [countdown, setCountdown] = useState(0) // 短信重发倒计时（秒）

  // 倒计时：每秒减 1（setState 在 setTimeout 回调里，不触碰同步 setState 规则）
  useEffect(() => {
    if (countdown <= 0) return undefined
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // 获取验证码：校验用户名+手机号后调 resetPasswordSmsSend
  const sendSms = async () => {
    let values
    try {
      values = await form.validateFields(['username', 'phone'])
    } catch {
      return // 表单校验未过，错误已内联提示
    }
    setSending(true)
    try {
      await cloud('resetPasswordSmsSend', {
        username: values.username,
        phone: values.phone,
      })
      setCountdown(60)
      message.success('验证码已发送，5 分钟内有效')
    } catch (err) {
      message.error(zhError(err, '发送失败，请稍后重试'))
    } finally {
      setSending(false)
    }
  }

  // 提交重置：全量校验 → 服务端核验验证码 → 改密 → 吊销该账号全部会话
  const doReset = async () => {
    let values
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setResetting(true)
    try {
      await cloud('resetPassword', {
        username: values.username,
        phone: values.phone,
        smsCode: values.smsCode,
        newPassword: values.password,
      })
      message.success('密码已重置，请使用新密码登录')
      onClose()
    } catch (err) {
      message.error(zhError(err, '重置失败'))
    } finally {
      setResetting(false)
    }
  }

  // 关闭即清空敏感项（保留用户名/手机号，方便改错重来）
  const handleClose = () => {
    form.resetFields(['smsCode', 'password', 'confirm'])
    setCountdown(0)
    onClose()
  }

  return (
    <Modal
      title="忘记密码"
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      maskClosable={false}
    >
      <Form form={form} layout="vertical" className={styles.form}>
        <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
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
                placeholder="注册时绑定的手机号"
                size="large"
                maxLength={11}
              />
            </Form.Item>
            <Button
              size="large"
              onClick={sendSms}
              loading={sending}
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
          <Input prefix={<SafetyOutlined />} placeholder="短信验证码" size="large" maxLength={6} />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 8, message: '密码至少 8 位' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="新密码" size="large" />
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
          <Input.Password prefix={<LockOutlined />} placeholder="确认新密码" size="large" />
        </Form.Item>
        <Form.Item className={styles.submitRow}>
          <Button type="primary" block size="large" loading={resetting} onClick={doReset}>
            重置密码
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
}
