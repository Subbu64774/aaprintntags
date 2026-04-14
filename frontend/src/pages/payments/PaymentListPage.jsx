import { useEffect, useState } from 'react';
import { Table, Button, Space, Popconfirm, Tag, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

const fmt = (v) => (v || 0).toFixed(2);
const modeColors = { CASH: 'green', UPI: 'purple', BANK_TRANSFER: 'blue', CHEQUE: 'orange', OTHER: 'default' };

export default function PaymentListPage() {
  const navigate = useNavigate();
  const { isViewer } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const fetchData = (page = 0, size = 10) => {
    setLoading(true);
    api.get('/payments', { params: { page, size } })
      .then((res) => {
        setData(res.data.content);
        setPagination((prev) => ({ ...prev, total: res.data.totalElements, current: page + 1, pageSize: size }));
      })
      .catch(() => message.error('Failed to load payments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleTableChange = (pag) => fetchData(pag.current - 1, pag.pageSize);

  const handleDelete = (id) => {
    api.delete(`/payments/${id}`)
      .then(() => { message.success('Payment deleted'); fetchData(pagination.current - 1, pagination.pageSize); })
      .catch(() => message.error('Delete failed'));
  };

  const columns = [
    { title: 'Payment #', dataIndex: 'paymentNumber', key: 'paymentNumber' },
    { title: 'Date', dataIndex: 'paymentDate', key: 'paymentDate' },
    { title: 'Invoice #', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'Customer', dataIndex: 'customerName', key: 'customerName' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v) => `₹ ${fmt(v)}`, align: 'right' },
    { title: 'Mode', dataIndex: 'paymentMode', key: 'paymentMode', render: (m) => <Tag color={modeColors[m] || 'default'}>{m}</Tag> },
    { title: 'Reference', dataIndex: 'referenceNumber', key: 'referenceNumber', render: (v) => v || '-' },
    {
      title: 'Actions', key: 'actions',
      render: (_, record) => (
        <Space>
          {!isViewer && (
            <Popconfirm title="Delete this payment? Invoice balance will be recalculated." onConfirm={() => handleDelete(record.paymentId)}>
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
        <h2 style={{ margin: 0 }}>Payments</h2>
        {!isViewer && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/payments/new')}>
            Record Payment
          </Button>
        )}
      </div>
      <Table rowKey="paymentId" columns={columns} dataSource={data} loading={loading} pagination={pagination} onChange={handleTableChange} scroll={{ x: 800 }} />
    </>
  );
}
