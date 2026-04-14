import { useEffect, useState } from 'react';
import { Table, Button, Input, Space, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const { isViewer } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [search, setSearch] = useState('');

  const fetchData = (page = 0, size = 10, name = '') => {
    setLoading(true);
    const params = { page, size };
    if (name) params.name = name;
    api.get('/employees', { params })
      .then((res) => {
        setData(res.data.content);
        setPagination((prev) => ({ ...prev, total: res.data.totalElements, current: page + 1, pageSize: size }));
      })
      .catch(() => message.error('Failed to load employees'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleTableChange = (pag) => {
    fetchData(pag.current - 1, pag.pageSize, search);
  };

  const handleSearch = (value) => {
    setSearch(value);
    fetchData(0, pagination.pageSize, value);
  };

  const handleDelete = (id) => {
    api.delete(`/employees/${id}`)
      .then(() => { message.success('Employee deleted'); fetchData(pagination.current - 1, pagination.pageSize, search); })
      .catch(() => message.error('Delete failed'));
  };

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => `${record.firstName || ''} ${record.lastName || ''}`.trim(),
    },
    { title: 'Designation', dataIndex: 'designation', key: 'designation' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
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
          <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/employees/${record.employeeId}`)} />
          {!isViewer && (
            <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/employees/${record.employeeId}/edit`)} />
          )}
          {!isViewer && (
            <Popconfirm title="Delete this employee?" onConfirm={() => handleDelete(record.employeeId)}>
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
        <h2 style={{ margin: 0 }}>Employees</h2>
        <Space wrap>
          <Input.Search placeholder="Search by name" allowClear onSearch={handleSearch} style={{ width: 220 }} />
          {!isViewer && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/employees/new')}>
              Add Employee
            </Button>
          )}
        </Space>
      </div>
      <Table
        rowKey="employeeId"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        scroll={{ x: 800 }}
      />
    </>
  );
}
