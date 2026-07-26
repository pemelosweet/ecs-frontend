import { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Radio,
  Switch,
  Button,
  Space,
  message,
  InputNumber,
  Upload,
} from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Dragger } = Upload

// 附件限制：单个文件不超过 10MB，最多 5 个
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_COUNT = 5

// Upload 事件转换为表单值（fileList）
const normFile = (e) => {
  if (Array.isArray(e)) return e
  return e?.fileList
}

export default function FormPage() {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  // 从服务端拉取最近一次提交并回填表单（loading 初始即为 true，无需重复置位）
  const loadLatest = async () => {
    try {
      const res = await fetch('/api/forms/latest')
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      form.setFieldsValue({
        title: data.title,
        type: data.type ?? undefined,
        category: data.category ?? undefined,
        level: data.level ?? undefined,
        date: data.date ? dayjs(data.date) : undefined,
        status: data.status,
        desc: data.desc ?? undefined,
        attachments: (data.attachments || []).map((f) => ({
          uid: `srv-${f.id}`,
          name: f.name,
          status: 'done',
          url: f.url,
          serverId: f.id,
        })),
      })
    } catch {
      // 无历史数据时静默忽略
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLatest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 提交到 Python 服务存储（multipart/form-data）
  const onFinish = async (values) => {
    const fd = new FormData()
    fd.append('title', values.title)
    if (values.type) fd.append('type', values.type)
    if (values.category) fd.append('category', values.category)
    if (values.level != null) fd.append('level', values.level)
    if (values.date) fd.append('date', values.date.format('YYYY-MM-DD'))
    fd.append('status', values.status ?? false)
    if (values.desc) fd.append('desc', values.desc)
    ;(values.attachments || []).forEach((file) => {
      if (file.originFileObj) {
        // 本次新选择的文件
        fd.append('files', file.originFileObj)
      } else if (file.serverId) {
        // 回填带出的已存文件，服务端直接复用
        fd.append('keep_file_ids', file.serverId)
      }
    })

    setSubmitting(true)
    try {
      const res = await fetch('/api/forms', { method: 'POST', body: fd })
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      message.success(`提交成功，记录 ID：${data.id}`)
    } catch (err) {
      message.error(`提交失败：${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // 本地校验大小后加入列表，返回 false 阻止自动上传（无后端）
  const beforeUpload = (file) => {
    const overSize = file.size / 1024 / 1024 > MAX_FILE_SIZE_MB
    if (overSize) {
      message.error(`${file.name} 超过 ${MAX_FILE_SIZE_MB}MB，已忽略`)
      return Upload.LIST_IGNORE
    }
    return false
  }

  return (
    <Card title="表单页示例" loading={loading}>
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 12 }}
        onFinish={onFinish}
        initialValues={{
          title: '默认标题',
          type: 'normal',
          category: 'tech',
          level: 1,
          date: dayjs(),
          status: true,
          desc: '这是一段默认描述，可直接提交或按需修改。',
        }}
      >
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
          <Input placeholder="请输入标题" />
        </Form.Item>

        <Form.Item name="type" label="类型">
          <Radio.Group>
            <Radio value="normal">普通</Radio>
            <Radio value="urgent">紧急</Radio>
            <Radio value="important">重要</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="category" label="分类">
          <Select
            placeholder="请选择分类"
            options={[
              { value: 'tech', label: '技术' },
              { value: 'product', label: '产品' },
              { value: 'operation', label: '运营' },
            ]}
          />
        </Form.Item>

        <Form.Item name="level" label="优先级">
          <InputNumber min={1} max={10} />
        </Form.Item>

        <Form.Item name="date" label="日期">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="status" label="是否启用" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="desc" label="描述">
          <TextArea rows={4} placeholder="请输入描述" />
        </Form.Item>

        <Form.Item
          name="attachments"
          label="附件"
          valuePropName="fileList"
          getValueFromEvent={normFile}
        >
          <Dragger multiple maxCount={MAX_FILE_COUNT} beforeUpload={beforeUpload}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持多文件，单个文件不超过 {MAX_FILE_SIZE_MB}MB，最多 {MAX_FILE_COUNT} 个
            </p>
          </Dragger>
        </Form.Item>

        <Form.Item wrapperCol={{ offset: 4 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              提交
            </Button>
            <Button onClick={() => form.resetFields()}>重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
