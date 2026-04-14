import { useEffect, useState, useCallback, useRef } from 'react';
import { Table, Button, Space, Popconfirm, message, Tag, Tooltip, Select, Input, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function OrderListPage() {
  const navigate = useNavigate();
  const { isViewer } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [customers, setCustomers] = useState([]);
  const [customerFilter, setCustomerFilter] = useState(undefined);
  const [poSearch, setPoSearch] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    api.get('/customers/search?q=').then((res) => setCustomers(res.data || [])).catch(() => {});
  }, []);

  const fetchData = useCallback((page = 0, size = 10, customer = customerFilter, po = poSearch) => {
    setLoading(true);
    const params = { page, size };
    if (customer) params.customerId = customer;
    if (po && po.trim()) params.poNumber = po.trim();
    api.get('/orders', { params })
      .then((res) => {
        setData(res.data.content);
        setPagination((prev) => ({ ...prev, total: res.data.totalElements, current: page + 1, pageSize: size }));
      })
      .catch(() => message.error('Failed to load purchase orders'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, []);

  // Auto-filter on customer change
  const handleCustomerChange = (val) => {
    setCustomerFilter(val);
    fetchData(0, pagination.pageSize, val, poSearch);
  };

  // Auto-filter on PO number typing (debounced 400ms)
  const handlePoSearch = (e) => {
    const val = e.target.value;
    setPoSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(0, pagination.pageSize, customerFilter, val);
    }, 400);
  };

  const handleReset = () => {
    setCustomerFilter(undefined);
    setPoSearch('');
    fetchData(0, pagination.pageSize, undefined, '');
  };

  const handleTableChange = (pag) => {
    fetchData(pag.current - 1, pag.pageSize);
  };

  const handleDelete = (id) => {
    api.delete(`/orders/${id}`)
      .then(() => { message.success('Purchase order deleted'); fetchData(pagination.current - 1, pagination.pageSize); })
      .catch((err) => message.error(err.response?.data || 'Delete failed'));
  };

  const columns = [
    { title: 'PO ID', dataIndex: 'orderId', key: 'orderId' },
    { title: 'PO Number', dataIndex: 'poNumber', key: 'poNumber' },
    { title: 'Customer', dataIndex: 'customerName', key: 'customerName' },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val) => val != null ? `₹${val.toFixed(2)}` : '-',
    },
    {
      title: 'Status',
      dataIndex: 'orderStatus',
      key: 'orderStatus',
      render: (status) => {
        const color = status === 'COMPLETED' ? 'green'
          : status === 'PARTIALLY_INVOICED' ? 'cyan'
          : status === 'PENDING' ? 'orange' : 'blue';
        return <Tag color={color}>{status || 'N/A'}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/orders/${record.orderId}`)} />
          {!isViewer && (
            <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/orders/${record.orderId}/edit`)} />
          )}
          {!isViewer && (
            record.hasInvoices ? (
              <Tooltip title="Cannot delete — invoices exist">
                <Button icon={<DeleteOutlined />} size="small" danger disabled />
              </Tooltip>
            ) : (
              <Popconfirm title="Delete this purchase order?" onConfirm={() => handleDelete(record.orderId)}>
                <Button icon={<DeleteOutlined />} size="small" danger />
              </Popconfirm>
            )
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Purchase Orders</h2>
        {!isViewer && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/orders/new')}>
            New Purchase Order
          </Button>
        )}
      </div>

      {/* Filters */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} sm={8}>
          <Select
            showSearch
            allowClear
            placeholder="Search by customer..."
            style={{ width: '100%' }}
            optionFilterProp="label"
            value={customerFilter}
            onChange={handleCustomerChange}
            options={customers.map((c) => ({ value: c.customerId, label: c.customerName }))}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Input
            allowClear
            placeholder="Search by PO number..."
            value={poSearch}
            onChange={handlePoSearch}
          />
        </Col>
        <Col xs={24} sm={4}>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
        </Col>
      </Row>

      <Table
        rowKey="orderId"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        scroll={{ x: 700 }}
      />
    </>
  );
}
