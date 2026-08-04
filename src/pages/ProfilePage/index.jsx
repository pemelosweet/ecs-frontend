/* eslint-disable max-lines */
import { useState, useEffect } from 'react'
import { Card, Form, Input, Radio, DatePicker, Select, Button, Space, message, Upload } from 'antd'
import { PlusOutlined, MinusCircleOutlined, UserOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { TextArea } = Input

// 头像限制：5MB，单张，仅 JPG/PNG/WebP
const AVATAR_MAX_SIZE_MB = 5
const AVATAR_ACCEPT = '.jpg,.jpeg,.png,.webp'

export default function ProfilePage() {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [avatarFile, setAvatarFile] = useState(null) // 待上传的新文件
  const [avatarPreview, setAvatarPreview] = useState(null) // 当前显示的头像 URL

  // 回填最新档案
  // eslint-disable-next-line complexity
  const loadLatest = async () => {
    try {
      const res = await fetch('/api/profile/latest')
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      form.setFieldsValue({
        name: data.name,
        gender: data.gender,
        birthday: data.birthday ? dayjs(data.birthday) : undefined,
        phone: data.phone,
        email: data.email,
        address: data.address,
        website: data.website,
        bio: data.bio,
        education: data.education || [],
        work: data.work || [],
        skills: data.skills || [],
        projects: data.projects || [],
        interests: data.interests || [],
        socialLinks: data.socialLinks
          ? Object.entries(data.socialLinks).map(([platform, url]) => ({ platform, url }))
          : [],
      })
      if (data.avatarUrl) setAvatarPreview(data.avatarUrl)
    } catch {
      // 无历史数据静默忽略
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 挂载时一次性拉取最新档案（订阅外部数据源，非同步状态联动）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLatest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 头像选择后做本地预览（不自动上传）
  const beforeUpload = (file) => {
    const overSize = file.size / 1024 / 1024 > AVATAR_MAX_SIZE_MB
    if (overSize) {
      message.error(`${file.name} 超过 ${AVATAR_MAX_SIZE_MB}MB`)
      return Upload.LIST_IGNORE
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setAvatarPreview(e.target.result)
    reader.readAsDataURL(file)
    return false
  }

  // 提交到 /api/profile（multipart/form-data）
  // eslint-disable-next-line complexity
  const onFinish = async (values) => {
    const fd = new FormData()
    fd.append('name', values.name)
    if (values.gender) fd.append('gender', values.gender)
    if (values.birthday) fd.append('birthday', values.birthday.format('YYYY-MM-DD'))
    if (values.phone) fd.append('phone', values.phone)
    if (values.email) fd.append('email', values.email)
    if (values.address) fd.append('address', values.address)
    if (values.website) fd.append('website', values.website)
    if (values.bio) fd.append('bio', values.bio)
    if (values.education?.length) fd.append('education', JSON.stringify(values.education))
    if (values.work?.length) fd.append('work', JSON.stringify(values.work))
    if (values.skills?.length) fd.append('skills', JSON.stringify(values.skills))
    if (values.projects?.length) fd.append('projects', JSON.stringify(values.projects))
    if (values.interests?.length) fd.append('interests', JSON.stringify(values.interests))
    if (values.socialLinks?.length) {
      const obj = Object.fromEntries(
        values.socialLinks.filter((x) => x?.platform).map((x) => [x.platform, x.url || ''])
      )
      fd.append('social_links', JSON.stringify(obj))
    }
    if (avatarFile) fd.append('avatar', avatarFile)

    setSubmitting(true)
    try {
      const res = await fetch('/api/profile', { method: 'POST', body: fd })
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      message.success(`档案已保存（ID：${data.id}）`)
      setAvatarFile(null)
    } catch (err) {
      message.error(`保存失败：${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card title="个人档案" loading={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          gender: 'male',
          education: [],
          work: [],
          skills: [],
          projects: [],
          interests: [],
          socialLinks: [],
        }}
      >
        {/* 头像区 */}
        <Form.Item label="头像">
          <Space direction="vertical" align="center" style={{ width: '100%' }}>
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="avatar"
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #eee',
                }}
              />
            ) : (
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserOutlined style={{ fontSize: 48, color: '#ccc' }} />
              </div>
            )}
            <Upload accept={AVATAR_ACCEPT} showUploadList={false} beforeUpload={beforeUpload}>
              <Button>选择头像</Button>
            </Upload>
            <div style={{ color: '#999', fontSize: 12 }}>JPG / PNG / WebP，不超过 5MB</div>
          </Space>
        </Form.Item>

        {/* 基本信息 */}
        <Card type="inner" title="基本信息" style={{ marginBottom: 16 }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="你的姓名" />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Radio.Group>
              <Radio value="male">男</Radio>
              <Radio value="female">女</Radio>
              <Radio value="other">其他</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="birthday" label="生日">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="phone" label="手机">
            <Input placeholder="13800138000" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="you@example.com" />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input placeholder="所在城市" />
          </Form.Item>
          <Form.Item name="website" label="个人网站">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="bio" label="自我介绍">
            <TextArea rows={3} placeholder="一句话介绍自己" />
          </Form.Item>
        </Card>

        {/* 技能（标签） */}
        <Card type="inner" title="技能" style={{ marginBottom: 16 }}>
          <Form.Item name="skills">
            <Select placeholder="回车添加技能" mode="tags" />
          </Form.Item>
        </Card>

        {/* 兴趣爱好（标签） */}
        <Card type="inner" title="兴趣爱好" style={{ marginBottom: 16 }}>
          <Form.Item name="interests">
            <Select placeholder="回车添加兴趣" mode="tags" />
          </Form.Item>
        </Card>

        {/* 教育经历（动态多条） */}
        <Card type="inner" title="教育经历" style={{ marginBottom: 16 }}>
          <Form.List name="education">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    style={{ display: 'flex', marginBottom: 8, flexWrap: 'wrap' }}
                    align="baseline"
                  >
                    <Form.Item
                      {...restField}
                      name={[name, 'school']}
                      rules={[{ required: true, message: '学校' }]}
                    >
                      <Input placeholder="学校" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'major']}>
                      <Input placeholder="专业" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'degree']}>
                      <Input placeholder="学位" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'start']}>
                      <Input placeholder="起始年份" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'end']}>
                      <Input placeholder="结束年份" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加教育经历
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Card>

        {/* 工作经历（动态多条） */}
        <Card type="inner" title="工作经历" style={{ marginBottom: 16 }}>
          <Form.List name="work">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    style={{ display: 'flex', marginBottom: 8, flexWrap: 'wrap' }}
                    align="baseline"
                  >
                    <Form.Item
                      {...restField}
                      name={[name, 'company']}
                      rules={[{ required: true, message: '公司' }]}
                    >
                      <Input placeholder="公司" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'title']}>
                      <Input placeholder="职位" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'start']}>
                      <Input placeholder="起始" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'end']}>
                      <Input placeholder="结束" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'desc']}>
                      <Input placeholder="简述" style={{ width: 240 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加工作经历
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Card>

        {/* 项目经历（动态多条） */}
        <Card type="inner" title="项目经历" style={{ marginBottom: 16 }}>
          <Form.List name="projects">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    style={{ display: 'flex', marginBottom: 8, flexWrap: 'wrap' }}
                    align="baseline"
                  >
                    <Form.Item
                      {...restField}
                      name={[name, 'name']}
                      rules={[{ required: true, message: '项目名' }]}
                    >
                      <Input placeholder="项目名" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'role']}>
                      <Input placeholder="角色" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'time']}>
                      <Input placeholder="时间" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'desc']}>
                      <Input placeholder="简述" style={{ width: 240 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加项目经历
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Card>

        {/* 社交链接（动态键值对） */}
        <Card type="inner" title="社交链接" style={{ marginBottom: 16 }}>
          <Form.List name="socialLinks">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'platform']}
                      rules={[{ required: true, message: '平台' }]}
                    >
                      <Input placeholder="平台（如 github）" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'url']}>
                      <Input placeholder="https://..." style={{ width: 320 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加社交链接
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Card>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存档案
            </Button>
            <Button onClick={() => form.resetFields()}>重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
