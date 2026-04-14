import { useEffect, useState } from 'react';
import { Table, Button, Input, Space, Select, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function ProductListPage() {
  const navigate = useNavigate();
  const { isViewer } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [hsnFilter, setHsnFilter] = useState(undefined);
  const [hsnOptions, setHsnOptions] = useState([]);

  const fetchData = (page = 0, size = 10, name = '', hsn = hsnFilter) => {
    setLoading(true);
    const params = { page, size };
    if (name) params.name = name;
    if (hsn) params.hsn = hsn;
    api.get('/products', { params })
      .then((res) => {
        setData(res.data.content);
        setPagination((prev) => ({ ...prev, total: res.data.totalElements, current: page + 1, pageSize: size }));
        // Extract unique HSN codes from all loaded data for the filter dropdown
        if (!hsnOptions.length) {
          const codes = [...new Set(res.data.content.map((p) => p.hsnCode).filter(Boolean))];
          if (codes.length) setHsnOptions(codes);
        }
      })
      .catch(() => message.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  // Also load all products once to get full HSN list
  useEffect(() => {
    fetchData();
    api.get('/products', { params: { page: 0, size: 500 } })
      .then((res) => {
        const codes = [...new Set((res.data.content || []).map((p) => p.hsnCode).filter(Boolean))].sort();
        setHsnOptions(codes);
      })
      .catch(() => {});
  }, []);

  const handleTableChange = (pag) => {
    fetchData(pag.current - 1, pag.pageSize, search, hsnFilter);
  };

  const handleSearch = (value) => {
    setSearch(value);
    fetchData(0, pagination.pageSize, value, hsnFilter);
  };

  const handleHsnChange = (value) => {
    setHsnFilter(value);
    fetchData(0, pagination.pageSize, search, value);
  };

  const handleDelete = (id) => {
    api.delete(`/products/${id}`)
      .then(() => { message.success('Product deleted'); fetchData(pagination.current - 1, pagination.pageSize, search, hsnFilter); })
      .catch(() => message.error('Delete failed'));
  };

  const columns = [
    { title: 'Name', dataIndex: 'productName', key: 'productName' },
    { title: 'Size', dataIndex: 'productSize', key: 'productSize' },
    { title: 'Price', dataIndex: 'productPrice', key: 'productPrice' },
    { title: 'HSN Code', dataIndex: 'hsnCode', key: 'hsnCode' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/products/${record.productId}`)} />
          {!isViewer && (
            <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/products/${record.productId}/edit`)} />
          )}
          {!isViewer && (
            <Popconfirm title="Delete this product?" onConfirm={() => handleDelete(record.productId)}>
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
        <h2 style={{ margin: 0 }}>Products</h2>
        <Space wrap>
          <Input.Search placeholder="Search by name" allowClear onSearch={handleSearch} style={{ width: 200 }} />
          <Select
            allowClear
            showSearch
            placeholder="HSN Code"
            style={{ width: 150 }}
            value={hsnFilter}
            onChange={handleHsnChange}
            options={hsnOptions.map((h) => ({ value: h, label: h }))}
          />
          {!isViewer && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/products/new')}>
              Add Product
            </Button>
          )}
        </Space>
      </div>
      <Table
        rowKey="productId"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        scroll={{ x: 600 }}
      />
    </>
  );
}
