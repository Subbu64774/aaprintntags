import { useEffect, useState, useCallback, useRef } from 'react';
import { Table, Button, Space, Popconfirm, Tag, Input, Row, Col, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FilePdfOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import generateQuotePdf from './quotePdfGenerator';
import { useAuth } from '../../context/AuthContext';

const statusColor = (s) =>
  s === 'ACCEPTED' ? 'green' : s === 'REJECTED' ? 'red' : s === 'SENT' ? 'blue' : s === 'EXPIRED' ? 'orange' : 'default';

export default function QuoteListPage() {
  const navigate = useNavigate();
  const { isViewer } = useAuth();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [quoteSearch, setQuoteSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const debounceRef = useRef(null);

  const fetchData = useCallback((page = 0, size = 10, qn = quoteSearch, cn = customerSearch) => {
    setLoading(true);
    const params = { page, size };
    if (qn && qn.trim()) params.quoteNumber = qn.trim();
    if (cn && cn.trim()) params.customerName = cn.trim();
    api.get('/quotes', { params })
      .then((res) => {
        setData(res.data.content);
        setPagination((prev) => ({ ...prev, total: res.data.totalElements, current: page + 1, pageSize: size }));
      })
      .catch(() => message.error('Failed to load quotes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handleTableChange = (pag) => fetchData(pag.current - 1, pag.pageSize, quoteSearch, customerSearch);

  const handleQuoteSearch = (e) => {
    const val = e.target.value;
    setQuoteSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(0, pagination.pageSize, val, customerSearch), 350);
  };

  const handleCustomerSearch = (e) => {
    const val = e.target.value;
    setCustomerSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(0, pagination.pageSize, quoteSearch, val), 350);
  };

  const handleReset = () => {
    setQuoteSearch('');
    setCustomerSearch('');
    fetchData(0, pagination.pageSize, '', '');
  };

  const handleDelete = (id) => {
    api.delete(`/quotes/${id}`)
      .then(() => { message.success('Quote deleted'); fetchData(pagination.current - 1, pagination.pageSize); })
      .catch(() => message.error('Delete failed'));
  };

  const handleDownloadPdf = async (quoteId, action = 'download') => {
    setPdfLoadingId(quoteId);
    try {
      const res = await api.get(`/quotes/${quoteId}`);
      await generateQuotePdf(res.data, action);
    } catch {
      message.error('Failed to generate PDF');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const resolveCustomer = (r) => r.customerName || r.adhocCustomerName || '-';

  const columns = [
    { title: 'Quote #', dataIndex: 'quoteNumber', key: 'quoteNumber', width: 140 },
    { title: 'Date', dataIndex: 'quoteDate', key: 'quoteDate', width: 110 },
    { title: 'Valid Until', dataIndex: 'validUntil', key: 'validUntil', width: 110 },
    { title: 'Customer', key: 'customer', render: (_, r) => resolveCustomer(r) },
    { title: 'GST', key: 'gst', width: 60, render: (_, r) => r.includeGst ? <Tag color="blue">GST</Tag> : <Tag>No GST</Tag> },
    {
      title: 'Grand Total', key: 'grandTotal', width: 120, align: 'right',
      render: (_, r) => r.grandTotal != null ? `₹${Number(r.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-',
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 100,
      render: (s) => <Tag color={statusColor(s)}>{s || 'DRAFT'}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 160,
      render: (_, record) => (
        <Space size={4}>
          <Button icon={<EyeOutlined />} size="small" title="View" onClick={() => navigate(`/quotes/${record.quoteId}`)} />
          <Button icon={<FilePdfOutlined />} size="small" title="Download PDF" loading={pdfLoadingId === record.quoteId} onClick={() => handleDownloadPdf(record.quoteId)} />
          {!isViewer && (
            <Button icon={<EditOutlined />} size="small" title="Edit" onClick={() => navigate(`/quotes/${record.quoteId}/edit`)} />
          )}
          {!isViewer && (
            <Popconfirm title="Delete this quote?" onConfirm={() => handleDelete(record.quoteId)}>
              <Button icon={<DeleteOutlined />} size="small" danger title="Delete" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Quotations</h2>
        {!isViewer && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/quotes/new')}>
            New Quote
          </Button>
        )}
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} sm={9}>
          <Input
            allowClear
            placeholder="Search by quote number..."
            value={quoteSearch}
            onChange={handleQuoteSearch}
          />
        </Col>
        <Col xs={24} sm={9}>
          <Input
            allowClear
            placeholder="Search by customer name..."
            value={customerSearch}
            onChange={handleCustomerSearch}
          />
        </Col>
        <Col xs={24} sm={6}>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
        </Col>
      </Row>

      <Table
        rowKey="quoteId"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        scroll={{ x: 900 }}
      />
    </>
  );
}

