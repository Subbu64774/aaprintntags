import { useEffect, useState } from 'react';
import { Table, Button, Space, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function ProductionUnitListPage() {
  const navigate = useNavigate();
  const { isViewer } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    api.get('/production-units')
      .then((res) => setData(res.data))
      .catch(() => message.error('Failed to load production units'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = (id) => {
    api.delete(`/production-units/${id}`)
      .then(() => { message.success('Production unit deleted'); fetchData(); })
      .catch(() => message.error('Delete failed'));
  };

  const columns = [
    { title: 'Code', dataIndex: 'unitCode', key: 'unitCode' },
    { title: 'Name', dataIndex: 'unitName', key: 'unitName' },
    { title: 'City', dataIndex: 'city', key: 'city' },
    { title: 'State', dataIndex: 'state', key: 'state' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
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
          {!isViewer && (
            <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/production-units/${record.productionUnitId}/edit`)} />
          )}
          {!isViewer && (
            <Popconfirm title="Delete?" onConfirm={() => handleDelete(record.productionUnitId)}>
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
        <h2 style={{ margin: 0 }}>Production Units</h2>
        {!isViewer && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/production-units/new')}>Add Unit</Button>
        )}
      </div>
      <Table rowKey="productionUnitId" columns={columns} dataSource={data} loading={loading} pagination={false} scroll={{ x: 700 }} />
    </>
  );
}
