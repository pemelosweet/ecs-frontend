import { useState, useEffect } from 'react'
import { Card, Form, Input, Select, DatePicker, Switch, Button, Space, message } from 'antd'
import dayjs from 'dayjs'
import Parse from '@/lib/parse'
import { zhError } from '@/lib/errorMsg'

const { TextArea } = Input

export default function OrgPage() {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  // 拉取最近一次保存的组织信息回填表单
  const loadLatest = async () => {
    try {
      const org = await new Parse.Query('Org').descending('createdAt').limit(1).first()
      if (org) {
        form.setFieldsValue({
          orgName: org.get('orgName'),
          orgCode: org.get('orgCode') ?? undefined,
          orgType: org.get('orgType') ?? undefined,
          legalPerson: org.get('legalPerson') ?? undefined,
          phone: org.get('phone') ?? undefined,
          email: org.get('email') ?? undefined,
          address: org.get('address') ?? undefined,
          establishDate: org.get('establishDate') ? dayjs(org.get('establishDate')) : undefined,
          status: org.get('status'),
          description: org.get('description') ?? undefined,
        })
      }
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

  // 提交保存
  const onFinish = async (values) => {
    const payload = {
      orgName: values.orgName,
      orgCode: values.orgCode ?? null,
      orgType: values.orgType ?? null,
      legalPerson: values.legalPerson ?? null,
      phone: values.phone ?? null,
      email: values.email ?? null,
      address: values.address ?? null,
      establishDate: values.establishDate ? values.establishDate.format('YYYY-MM-DD') : null,
      status: values.status ?? true,
      description: values.description ?? null,
    }

    setSubmitting(true)
    try {
      // 直连 /classes 保存（author 由服务端 beforeSave 自动填充）
      const org = new Parse.Object('Org').set(payload)
      await org.save()
      message.success(`保存成功，记录 ID：${org.id}`)
    } catch (err) {
      message.error(`保存失败：${zhError(err)}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card title="组织信息" loading={loading}>
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 12 }}
        onFinish={onFinish}
        initialValues={{ orgType: 'enterprise', status: true }}
      >
        <Form.Item
          name="orgName"
          label="组织名称"
          rules={[{ required: true, message: '请输入组织名称' }]}
        >
          <Input placeholder="请输入组织名称" />
        </Form.Item>

        <Form.Item name="orgCode" label="统一社会信用代码">
          <Input placeholder="请输入统一社会信用代码" />
        </Form.Item>

        <Form.Item name="orgType" label="组织类型">
          <Select
            placeholder="请选择组织类型"
            options={[
              { value: 'enterprise', label: '企业' },
              { value: 'institution', label: '事业单位' },
              { value: 'government', label: '政府机关' },
              { value: 'social', label: '社会团体' },
              { value: 'individual', label: '个体工商户' },
              { value: 'other', label: '其他' },
            ]}
          />
        </Form.Item>

        <Form.Item name="legalPerson" label="法定代表人">
          <Input placeholder="请输入法定代表人" />
        </Form.Item>

        <Form.Item name="phone" label="联系电话">
          <Input placeholder="请输入联系电话" />
        </Form.Item>

        <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
          <Input placeholder="请输入邮箱" />
        </Form.Item>

        <Form.Item name="address" label="注册地址">
          <Input placeholder="请输入注册地址" />
        </Form.Item>

        <Form.Item name="establishDate" label="成立日期">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="status" label="是否启用" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="description" label="简介">
          <TextArea rows={4} placeholder="请输入组织简介" />
        </Form.Item>

        <Form.Item wrapperCol={{ offset: 4 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存
            </Button>
            <Button onClick={() => form.resetFields()}>重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
