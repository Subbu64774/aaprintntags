import { useEffect, useState } from 'react';
import { Table, Button, Space, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

export default function TenantListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    api.get('/tenants')
      .then((res) => setData(res.data))
      .catch(() => message.error('Failed to load tenants'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = (id) => {
    api.delete(`/tenants/${id}`)
      .then(() => { message.success('Tenant deleted'); fetchData(); })
      .catch(() => message.error('Delete failed'));
  };

  const columns = [
    { title: 'Code', dataIndex: 'tenantCode', key: 'tenantCode', width: 100 },
    { title: 'Business Name', dataIndex: 'tenantName', key: 'tenantName' },
    { title: 'Type', dataIndex: 'businessType', key: 'businessType' },
    { title: 'Contact', dataIndex: 'contactPerson', key: 'contactPerson' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'City', dataIndex: 'city', key: 'city' },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
      render: (p) => {
        const color = p === 'PRO' ? 'gold' : p === 'BASIC' ? 'blue' : 'default';
        return p ? <Tag color={color}>{p}</Tag> : '-';
      },
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/tenants/${record.tenantId}/edit`)} />
          <Popconfirm title="Delete this tenant?" onConfirm={() => handleDelete(record.tenantId)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Tenants (Subscribed Businesses)</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tenants/new')}>Onboard Tenant</Button>
      </div>
      <Table rowKey="tenantId" columns={columns} dataSource={data} loading={loading} pagination={false} scroll={{ x: 800 }} />
    </>
  );
}
