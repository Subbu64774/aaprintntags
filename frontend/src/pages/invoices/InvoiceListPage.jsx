import { useEffect, useState, useCallback, useRef } from 'react';
import { Table, Button, Space, Popconfirm, Tag, Switch, Select, Input, Row, Col, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FilePdfOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import generateInvoicePdf from './invoicePdfGenerator';
import { useAuth } from '../../context/AuthContext';

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const { isViewer } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [fscOnly, setFscOnly] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerFilter, setCustomerFilter] = useState(undefined);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [poSearch, setPoSearch] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    api.get('/customers/search?q=').then((res) => setCustomers(res.data || [])).catch(() => {});
  }, []);

  const fetchData = useCallback((page = 0, size = 10, fsc = fscOnly, customer = customerFilter, invNum = invoiceSearch, po = poSearch) => {
    setLoading(true);
    const params = { page, size };
    if (fsc) params.fsc = true;
    if (customer) params.customerId = customer;
    if (invNum && invNum.trim()) params.invoiceNumber = invNum.trim();
    if (po && po.trim()) params.poNumber = po.trim();
    api.get('/invoices', { params })
      .then((res) => {
        setData(res.data.content);
        setPagination((prev) => ({ ...prev, total: res.data.totalElements, current: page + 1, pageSize: size }));
      })
      .catch(() => message.error('Failed to load invoices'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handleTableChange = (pag) => fetchData(pag.current - 1, pag.pageSize, fscOnly, customerFilter, invoiceSearch, poSearch);

  const handleFscToggle = (checked) => {
    setFscOnly(checked);
    fetchData(0, pagination.pageSize, checked, customerFilter, invoiceSearch, poSearch);
  };

  const handleCustomerChange = (val) => {
    setCustomerFilter(val);
    fetchData(0, pagination.pageSize, fscOnly, val, invoiceSearch, poSearch);
  };

  const handleInvoiceSearch = (e) => {
    const val = e.target.value;
    setInvoiceSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(0, pagination.pageSize, fscOnly, customerFilter, val, poSearch);
    }, 400);
  };

  const handlePoSearch = (e) => {
    const val = e.target.value;
    setPoSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(0, pagination.pageSize, fscOnly, customerFilter, invoiceSearch, val);
    }, 400);
  };

  const handleReset = () => {
    setCustomerFilter(undefined);
    setInvoiceSearch('');
    setPoSearch('');
    setFscOnly(false);
    fetchData(0, pagination.pageSize, false, undefined, '', '');
  };

  const handleDelete = (id) => {
    api.delete(`/invoices/${id}`)
      .then(() => { message.success('Invoice deleted'); fetchData(pagination.current - 1, pagination.pageSize); })
      .catch(() => message.error('Delete failed'));
  };

  const handleDownloadPdf = async (invoiceId) => {
    setPdfLoadingId(invoiceId);
    try {
      const res = await api.get(`/invoices/${invoiceId}`);
      await generateInvoicePdf(res.data);
    } catch (err) {
      console.error('PDF error:', err);
      message.error('Failed to generate PDF');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const statusColor = (s) => s === 'FINALIZED' ? 'green' : s === 'CANCELLED' ? 'red' : 'blue';

  const columns = [
    { title: 'Invoice #', dataIndex: 'invoiceNumber', key: 'invoiceNumber',
      render: (v, record) => <>{v} {record.fscInvoice && <Tag color="green" style={{ fontSize: 10, padding: '0 4px', marginLeft: 4 }}>FSC</Tag>}</>
    },
    { title: 'Date', dataIndex: 'invoiceDate', key: 'invoiceDate' },
    { title: 'PO Number', dataIndex: 'poNumber', key: 'poNumber' },
    { title: 'Customer', dataIndex: 'customerName', key: 'customerName' },
    { title: 'Amount', dataIndex: 'invoiceAmount', key: 'invoiceAmount', render: (v) => v != null ? `₹${v.toFixed(2)}` : '-' },
    { title: 'Status', dataIndex: 'invoiceStatus', key: 'invoiceStatus', render: (s) => <Tag color={statusColor(s)}>{s || 'N/A'}</Tag> },
    { title: 'Payment', dataIndex: 'paymentStatus', key: 'paymentStatus', render: (s) => {
      const c = s === 'PAID' ? 'green' : s === 'PARTIALLY_PAID' ? 'orange' : 'red';
      return <Tag color={c}>{s || 'UNPAID'}</Tag>;
    }},
    {
      title: 'Actions', key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/invoices/${record.invoiceId}`)} />
          <Button icon={<FilePdfOutlined />} size="small" title="Download PDF" loading={pdfLoadingId === record.invoiceId} onClick={() => handleDownloadPdf(record.invoiceId)} />
          {!isViewer && (
            <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/invoices/${record.invoiceId}/edit`)} />
          )}
          {!isViewer && (
            <Popconfirm title="Delete this invoice?" onConfirm={() => handleDelete(record.invoiceId)}>
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
        <Space wrap>
          <h2 style={{ margin: 0 }}>Invoices</h2>
          <Switch size="small" checked={fscOnly} onChange={handleFscToggle} />
          <span style={{ fontSize: 13, color: fscOnly ? '#52c41a' : '#999' }}>FSC Only</span>
        </Space>
        {!isViewer && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>
            New Invoice
          </Button>
        )}
      </div>

      {/* Filters */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} sm={7}>
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
        <Col xs={24} sm={7}>
          <Input
            allowClear
            placeholder="Search by invoice number..."
            value={invoiceSearch}
            onChange={handleInvoiceSearch}
          />
        </Col>
        <Col xs={24} sm={7}>
          <Input
            allowClear
            placeholder="Search by PO number..."
            value={poSearch}
            onChange={handlePoSearch}
          />
        </Col>
        <Col xs={24} sm={3}>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
        </Col>
      </Row>

      <Table rowKey="invoiceId" columns={columns} dataSource={data} loading={loading} pagination={pagination} onChange={handleTableChange} scroll={{ x: 900 }} />
    </>
  );
}
