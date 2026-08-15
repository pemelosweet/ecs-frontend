import { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Table,
  Tag,
  Popconfirm,
  Tooltip,
  message,
} from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import Parse from '@/lib/parse'
import { zhError } from '@/lib/errorMsg'
import { getCurrentUser, ROLE_ADMIN } from '@/lib/permissions'

const { Option } = Select

const STATUS_META = {
  active: { text: '正常', color: 'green' },
  disabled: { text: '已禁用', color: 'red' },
}

export default function UserManagementPage() {
  const [form] = Form.useForm()
  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [operatingId, setOperatingId] = useState(null)

  const currentUser = getCurrentUser()

  const loadUsers = useCallback(
    async (nextPage = page, nextPageSize = pageSize) => {
      const values = form.getFieldsValue()
      setLoading(true)
      try {
        const res = await Parse.Cloud.run('adminUserList', {
          page: nextPage,
          pageSize: nextPageSize,
          username: values.username?.trim() || undefined,
          role: values.role || undefined,
          status: values.status || undefined,
        })
        setList(res.list || [])
        setTotal(res.total || 0)
        setPage(res.page || 1)
      } catch (err) {
        message.error(zhError(err, '加载用户列表失败'))
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize]
  )

  useEffect(() => {
    let cancelled = false
    // 异步化初始加载，避免在 effect 内同步 setState
    ;(async () => {
      await Promise.resolve()
      if (cancelled) return
      await loadUsers(1, pageSize)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => {
    loadUsers(1, pageSize)
  }

  const handleReset = () => {
    form.resetFields()
    loadUsers(1, pageSize)
  }

  // 禁用 / 启用
  const handleToggleStatus = async (record) => {
    const nextStatus = record.status === 'disabled' ? 'active' : 'disabled'
    setOperatingId(record.id)
    try {
      await Parse.Cloud.run('adminSetUserStatus', {
        userId: record.id,
        status: nextStatus,
      })
      message.success(
        nextStatus === 'disabled'
          ? `已禁用用户「${record.username}」`
          : `已启用用户「${record.username}」`
      )
      loadUsers()
    } catch (err) {
      message.error(zhError(err, '操作失败'))
    } finally {
      setOperatingId(null)
    }
  }

  // 删除（完全移除）
  const handleDelete = async (record) => {
    setOperatingId(record.id)
    try {
      await Parse.Cloud.run('adminDeleteUser', { userId: record.id })
      message.success(`已删除用户「${record.username}」`)
      // 删除后当前页可能为空，回退一页
      const nextPage = list.length === 1 && page > 1 ? page - 1 : page
      loadUsers(nextPage)
    } catch (err) {
      message.error(zhError(err, '删除失败'))
    } finally {
      setOperatingId(null)
    }
  }

  const isSelf = (record) => currentUser && record.id === currentUser.id

  const columns = [
    {
      title: '用户名称',
      dataIndex: 'username',
      key: 'username',
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          {isSelf(record) && <Tag color="blue">当前账号</Tag>}
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role) =>
        role === ROLE_ADMIN ? <Tag color="blue">管理员</Tag> : <Tag>普通用户</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const meta = STATUS_META[status] || STATUS_META.active
        return <Tag color={meta.color}>{meta.text}</Tag>
      },
    },
    {
      title: '注册日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => {
        const self = isSelf(record)
        const isAdminTarget = record.role === ROLE_ADMIN
        // 自己 / 其他管理员账户不可操作
        const locked = self || isAdminTarget
        const lockedTip = self ? '不能操作当前登录账号' : '管理员账户受保护，不可禁用或删除'

        const statusBtn =
          record.status === 'disabled' ? (
            <Button
              type="link"
              size="small"
              disabled={locked || operatingId === record.id}
              onClick={() => handleToggleStatus(record)}
            >
              启用
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              danger
              disabled={locked || operatingId === record.id}
              onClick={() => handleToggleStatus(record)}
            >
              禁用
            </Button>
          )

        const deleteBtn = (
          <Popconfirm
            title="确认删除该用户？"
            description={`删除后「${record.username}」将被完全移除，其个人档案一并清除，不可恢复。`}
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            disabled={locked || operatingId === record.id}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" size="small" danger disabled={locked || operatingId === record.id}>
              删除
            </Button>
          </Popconfirm>
        )

        return locked ? (
          <Tooltip title={lockedTip}>
            <Space size={0}>
              {statusBtn}
              {deleteBtn}
            </Space>
          </Tooltip>
        ) : (
          <Space size={0}>
            {statusBtn}
            {deleteBtn}
          </Space>
        )
      },
    },
  ]

  return (
    <Card title="用户管理">
      {/* 搜索区：用户名称 / 类型（角色）/ 状态 */}
      <Form form={form} layout="inline" style={{ marginBottom: 16, rowGap: 12 }}>
        <Form.Item name="username" label="用户名称">
          <Input placeholder="请输入用户名称" allowClear style={{ width: 200 }} />
        </Form.Item>
        <Form.Item name="role" label="类型">
          <Select placeholder="全部" allowClear style={{ width: 140 }}>
            <Option value={ROLE_ADMIN}>管理员</Option>
            <Option value="user">普通用户</Option>
          </Select>
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select placeholder="全部" allowClear style={{ width: 140 }}>
            <Option value="active">正常</Option>
            <Option value="disabled">已禁用</Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
            loadUsers(p, ps)
          },
        }}
      />
    </Card>
  )
}
