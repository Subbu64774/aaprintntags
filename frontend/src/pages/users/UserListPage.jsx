import { useEffect, useState } from 'react';
import { Table, Button, Space, Popconfirm, message, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api';

const roleColors = { ADMIN: 'red', MANAGER: 'volcano', STAFF: 'blue', VIEWER: 'default' };

export default function UserListPage() {
  const navigate = useNavigate();
  const { isAdmin, isViewer } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    api.get('/users')
      .then((res) => setData(res.data))
      .catch(() => message.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = (id) => {
    api.delete(`/users/${id}`)
      .then(() => { message.success('User deactivated'); fetchData(); })
      .catch(() => message.error('Delete failed'));
  };

  const columns = [
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Full Name', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => <Tag color={roleColors[role] || 'default'}>{role}</Tag>,
    },
    ...(isAdmin ? [{ title: 'Tenant', dataIndex: 'tenantName', key: 'tenantName', render: (v) => v || <Tag>SUPER ADMIN</Tag> }] : []),
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (perms, record) => {
        if (record.role === 'ADMIN' || record.role === 'MANAGER') return <Tag color="green">Full Access</Tag>;
        if (!perms || !perms.length) return <Tag>None</Tag>;
        const editCount = perms.filter((p) => p.endsWith(':edit')).length;
        const viewCount = perms.filter((p) => p.endsWith(':view')).length;
        return (
          <Tooltip title={perms.join(', ')}>
            <Space size={4}>
              <Tag color="blue">{viewCount} view</Tag>
              {editCount > 0 && <Tag color="orange">{editCount} edit</Tag>}
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (active) => <Tag color={active ? 'green' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {!isViewer && (
            <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/users/${record.userId}/edit`)} />
          )}
          {!isViewer && (
            <Popconfirm title="Deactivate this user?" onConfirm={() => handleDelete(record.userId)}>
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Users</h2>
        {!isViewer && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/users/new')}>Add User</Button>
        )}
      </div>
      <Table rowKey="userId" columns={columns} dataSource={data} loading={loading} pagination={false} scroll={{ x: 800 }} />
    </>
  );
}
