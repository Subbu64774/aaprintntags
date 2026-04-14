import { useEffect, useState } from 'react';
import { Button, Descriptions, Table, Tag, Space, Divider, message, Spin, Popconfirm, Typography, Card, Row, Col } from 'antd';
import {
  FilePdfOutlined, DownloadOutlined, EditOutlined, ArrowLeftOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import generateQuotePdf from './quotePdfGenerator';
import { useAuth } from '../../context/AuthContext';

const { Text, Title } = Typography;

const statusColor = (s) =>
  s === 'ACCEPTED' ? 'green' : s === 'REJECTED' ? 'red' : s === 'SENT' ? 'blue' : s === 'EXPIRED' ? 'orange' : 'default';

export default function QuoteViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isViewer } = useAuth();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    api.get(`/quotes/${id}`)
      .then((res) => setQuote(res.data))
      .catch(() => message.error('Failed to load quote'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePdf = async (action) => {
    setPdfLoading(true);
    try { await generateQuotePdf(quote, action); }
    catch { message.error('Failed to generate PDF'); }
    finally { setPdfLoading(false); }
  };

  const handleDelete = () => {
    api.delete(`/quotes/${id}`)
      .then(() => { message.success('Quote deleted'); navigate('/quotes'); })
      .catch(() => message.error('Delete failed'));
  };

  const fmt = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;
  if (!quote) return <div style={{ padding: 24 }}>Quote not found.</div>;

  const customerName = quote.customerId ? quote.customerName : quote.adhocCustomerName;
  const customerPhone = quote.customerId ? quote.customerPhone : quote.adhocCustomerPhone;
  const customerEmail = quote.customerId ? quote.customerEmail : quote.adhocCustomerEmail;
  const customerGst = quote.customerId ? quote.customerGst : quote.adhocCustomerGst;

  // Line items columns
  const gstCols = quote.includeGst ? [
    { title: 'CGST %', dataIndex: 'cgst', key: 'cgst', width: 80, align: 'right', render: (v) => v > 0 ? `${v}%` : '-' },
    { title: 'SGST %', dataIndex: 'sgst', key: 'sgst', width: 80, align: 'right', render: (v) => v > 0 ? `${v}%` : '-' },
    { title: 'IGST %', dataIndex: 'igst', key: 'igst', width: 80, align: 'right', render: (v) => v > 0 ? `${v}%` : '-' },
    { title: 'CGST Amt', dataIndex: 'cgstAmount', key: 'cgstAmount', width: 100, align: 'right', render: (v) => v > 0 ? `₹${fmt(v)}` : '-' },
    { title: 'SGST Amt', dataIndex: 'sgstAmount', key: 'sgstAmount', width: 100, align: 'right', render: (v) => v > 0 ? `₹${fmt(v)}` : '-' },
    { title: 'IGST Amt', dataIndex: 'igstAmount', key: 'igstAmount', width: 100, align: 'right', render: (v) => v > 0 ? `₹${fmt(v)}` : '-' },
  ] : [];

  const columns = [
    { title: '#', key: 'sn', width: 40, render: (_, __, idx) => idx + 1 },
    { title: 'Product / Service', key: 'product', render: (_, r) => (
      <Space direction="vertical" size={0}>
        <Text strong>{r.productName}</Text>
        {r.description && <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>}
      </Space>
    )},
    { title: 'Qty', dataIndex: 'quantity', key: 'qty', width: 70, align: 'right' },
    { title: 'Price', dataIndex: 'price', key: 'price', width: 110, align: 'right', render: (v) => `₹${fmt(v)}` },
    { title: 'Amount', dataIndex: 'totalPrice', key: 'totalPrice', width: 120, align: 'right', render: (v) => <Text strong>₹{fmt(v)}</Text> },
    ...gstCols,
    {
      title: quote.includeGst ? 'Line Total' : 'Total',
      dataIndex: 'lineTotal', key: 'lineTotal', width: 120, align: 'right',
      render: (v) => <Text strong style={{ color: '#1677ff' }}>₹{fmt(v)}</Text>,
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/quotes')}>Back</Button>
          <Title level={4} style={{ margin: 0 }}>{quote.quoteNumber}</Title>
          <Tag color={statusColor(quote.status)}>{quote.status || 'DRAFT'}</Tag>
          <Tag color={quote.includeGst ? 'blue' : 'default'}>{quote.includeGst ? 'With GST' : 'Without GST'}</Tag>
        </Space>
        <Space wrap>
          <Button icon={<FilePdfOutlined />} loading={pdfLoading} onClick={() => handlePdf('view')}>View PDF</Button>
          <Button icon={<DownloadOutlined />} loading={pdfLoading} type="primary" ghost onClick={() => handlePdf('download')}>Download PDF</Button>
          {!isViewer && (
            <Button icon={<EditOutlined />} type="primary" onClick={() => navigate(`/quotes/${id}/edit`)}>Edit</Button>
          )}
          {!isViewer && (
            <Popconfirm title="Delete this quote?" onConfirm={handleDelete}>
              <Button icon={<DeleteOutlined />} danger>Delete</Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      <Row gutter={16}>
        {/* Quote meta */}
        <Col xs={24} md={12}>
          <Card title="Quotation Details" size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Quote Number">{quote.quoteNumber}</Descriptions.Item>
              <Descriptions.Item label="Date">{quote.quoteDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="Validity">{quote.validityDays ? `${quote.validityDays} days` : '-'}</Descriptions.Item>
              <Descriptions.Item label="Valid Until">
                {quote.validUntil ? <Text strong style={{ color: '#1677ff' }}>{quote.validUntil}</Text> : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColor(quote.status)}>{quote.status || 'DRAFT'}</Tag>
              </Descriptions.Item>
              {quote.remarks && <Descriptions.Item label="Remarks">{quote.remarks}</Descriptions.Item>}
            </Descriptions>
          </Card>
        </Col>

        {/* Customer */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <span>Customer</span>
                {quote.customerId
                  ? <Tag color="blue">Existing Customer</Tag>
                  : <Tag color="orange">Adhoc</Tag>}
              </Space>
            }
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Name">{customerName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{customerPhone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{customerEmail || '-'}</Descriptions.Item>
              <Descriptions.Item label="GSTIN">{customerGst || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Line Items */}
      <Card title="Line Items" size="small" style={{ marginBottom: 16 }}>
        <Table
          rowKey="quoteItemId"
          columns={columns}
          dataSource={quote.quoteItems || []}
          pagination={false}
          size="small"
          scroll={{ x: quote.includeGst ? 1000 : 600 }}
        />
      </Card>

      {/* Summary */}
      <Card size="small" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
              <Text>Sub Total</Text>
              <Text strong>₹{fmt(quote.subTotal)}</Text>
            </div>
            {quote.includeGst && (
              <>
                {(quote.totalCgst || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                    <Text type="secondary">CGST</Text>
                    <Text style={{ color: '#1677ff' }}>₹{fmt(quote.totalCgst)}</Text>
                  </div>
                )}
                {(quote.totalSgst || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                    <Text type="secondary">SGST</Text>
                    <Text style={{ color: '#1677ff' }}>₹{fmt(quote.totalSgst)}</Text>
                  </div>
                )}
                {(quote.totalIgst || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                    <Text type="secondary">IGST</Text>
                    <Text style={{ color: '#1677ff' }}>₹{fmt(quote.totalIgst)}</Text>
                  </div>
                )}
              </>
            )}
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <Text strong style={{ fontSize: 16 }}>Grand Total</Text>
              <Text strong style={{ fontSize: 17, color: '#1677ff' }}>₹{fmt(quote.grandTotal)}</Text>
            </div>
          </div>
        </div>
      </Card>

      {/* Terms & Conditions */}
      <Card title="Terms & Conditions" size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
        <ol style={{ paddingLeft: 20, fontSize: 13, lineHeight: '1.8', color: '#555' }}>
          <li>This quotation is valid until <strong>{quote.validUntil || `${quote.validityDays || 30} days from date`}</strong>. After this date, prices may change without notice.</li>
          <li>Prices are subject to change without prior notice after the validity period.</li>
          <li>Payment terms: 50% advance with order confirmation; balance before delivery.</li>
          <li>Delivery timeline will be confirmed upon receipt of purchase order and advance payment.</li>
          <li>Goods once dispatched will not be taken back unless there is a manufacturing defect.</li>
          <li>All disputes are subject to local jurisdiction only.</li>
          <li>Taxes as applicable at the time of invoicing will be charged.</li>
        </ol>
      </Card>
    </div>
  );
}

