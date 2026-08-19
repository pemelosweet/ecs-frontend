import { useEffect, useState } from 'react'
import { Card, Table, Checkbox, Button, Space, Tag, Tooltip, Alert, message, Spin } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { cloud } from '@/lib/request'
import { zhError } from '@/lib/errorMsg'
import { menuConfig } from '@/router/menuConfig'
import styles from './index.module.less'

const ROLE_LABELS = {
  user: '普通用户',
  admin: '管理员',
}

export default function PermissionPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userMenus, setUserMenus] = useState([])
  const [adminMenus, setAdminMenus] = useState([])
  const [lockedMenus, setLockedMenus] = useState([])

  // 拉取当前菜单权限配置
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await cloud('adminGetMenuPermissions')
        if (!mounted) return
        setUserMenus(res.user || [])
        setAdminMenus(res.admin || [])
        setLockedMenus(res.locked || [])
      } catch (err) {
        message.error(zhError(err, '加载权限配置失败'))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const toggle = (role, path, checked) => {
    const setter = role === 'user' ? setUserMenus : setAdminMenus
    setter((prev) =>
      checked ? (prev.includes(path) ? prev : [...prev, path]) : prev.filter((p) => p !== path)
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await cloud('adminUpdateMenuPermissions', {
        permissions: { user: userMenus, admin: adminMenus },
      })
      setUserMenus(res.user)
      setAdminMenus(res.admin)
      message.success('权限配置已保存')
    } catch (err) {
      message.error(zhError(err, '保存失败'))
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: '菜单名称',
      dataIndex: 'label',
      key: 'label',
      width: 160,
    },
    {
      title: '路径',
      dataIndex: 'key',
      key: 'key',
      render: (key) => <Tag>{key}</Tag>,
    },
    {
      title: ROLE_LABELS.user,
      key: 'user',
      width: 140,
      align: 'center',
      render: (_, record) => {
        // 普通用户不可拥有管理员专属菜单（不可勾选）
        const adminOnly = lockedMenus.includes(record.key)
        const checkbox = (
          <Checkbox
            checked={!adminOnly && userMenus.includes(record.key)}
            disabled={adminOnly}
            onChange={(e) => toggle('user', record.key, e.target.checked)}
          />
        )
        return adminOnly ? (
          <Tooltip title="普通用户不可拥有">
            <Space size={4}>
              {checkbox}
              <Tag color="default" className={styles.lockTag}>
                仅管理员
              </Tag>
            </Space>
          </Tooltip>
        ) : (
          checkbox
        )
      },
    },
    {
      title: ROLE_LABELS.admin,
      key: 'admin',
      width: 120,
      align: 'center',
      render: (_, record) => {
        // 管理员锁定菜单：默认勾选且禁止取消
        const locked = lockedMenus.includes(record.key)
        const checkbox = (
          <Checkbox
            checked={adminMenus.includes(record.key)}
            disabled={locked}
            onChange={(e) => toggle('admin', record.key, e.target.checked)}
          />
        )
        return locked ? (
          <Tooltip title="管理员默认拥有，禁止取消">
            <Space size={4}>
              {checkbox}
              <Tag color="gold" className={styles.lockTag}>
                锁定
              </Tag>
            </Space>
          </Tooltip>
        ) : (
          checkbox
        )
      },
    },
  ]

  const dataSource = menuConfig.map((m) => ({
    key: m.key,
    label: m.label,
    path: m.key,
  }))

  if (loading) {
    return (
      <Card title="权限管理">
        <div className={styles.loadingWrap}>
          <Spin size="large" />
        </div>
      </Card>
    )
  }

  return (
    <Card
      title="权限管理"
      extra={
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
          保存配置
        </Button>
      }
    >
      <Alert
        type="info"
        showIcon
        className={styles.tipAlert}
        message="勾选控制各角色可访问的菜单。权限管理和用户管理为管理员专属：管理员默认拥有、禁止取消；普通用户不可勾选。"
      />
      <Table rowKey="key" columns={columns} dataSource={dataSource} pagination={false} bordered />
    </Card>
  )
}
