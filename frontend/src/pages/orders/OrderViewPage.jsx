import { useEffect, useState, useMemo } from 'react';
import { Card, Descriptions, Table, Row, Col, Divider, Typography, Tag, Button, Space, Spin, message } from 'antd';
import { EditOutlined, ArrowLeftOutlined, FileTextOutlined, PrinterOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import generateJobCardPdf from './jobCardPdfGenerator';
import { useAuth } from '../../context/AuthContext';

const { Text } = Typography;
const fmt = (v) => (v || 0).toFixed(2);

export default function OrderViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isViewer } = useAuth();
  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [jobCardLoading, setJobCardLoading] = useState(false);

  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => { m[p.productId] = p; });
    return m;
  }, [products]);

  useEffect(() => {
    Promise.all([
      api.get(`/orders/${id}`),
      api.get('/products/search?q='),
    ])
      .then(([orderRes, prodRes]) => {
        setOrder(orderRes.data);
        setProducts(prodRes.data);
      })
      .catch(() => message.error('Failed to load purchase order'));
  }, [id]);

  const handleJobCard = async () => {
    if (!order) return;
    setJobCardLoading(true);
    try {
      await generateJobCardPdf(order, products);
    } catch (err) {
      console.error('Job Card PDF error:', err);
      message.error('Failed to generate Job Card');
    } finally {
      setJobCardLoading(false);
    }
  };

  if (!order) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const statusColor = order.orderStatus === 'COMPLETED' ? 'green'
    : order.orderStatus === 'CANCELLED' ? 'red'
    : order.orderStatus === 'PROCESSING' ? 'blue' : 'orange';

  const items = (order.orderProductDTOList || []).map((item, idx) => {
    const prod = productMap[item.productId];
    const origPrice = prod ? parseFloat(prod.productPrice) || 0 : 0;
    const lineBase = (item.quantity || 0) * (item.price || 0);
    const lineTaxPct = ((item.cgst || 0) + (item.sgst || 0) + (item.igst || 0));
    const lineTaxAmt = lineBase * (lineTaxPct / 100);
    return {
      ...item,
      key: idx,
      productName: prod?.productName || `Product #${item.productId}`,
      origPrice,
      lineBase,
      lineTaxAmt,
      lineTotal: lineBase + lineTaxAmt,
    };
  });

  // Detect if any line has GST values
  const isLineLevelGst = items.some(
    (i) => i.cgst != null || i.sgst != null || i.igst != null,
  );

  const subTotal = items.reduce((s, i) => s + i.lineBase, 0);
  // Line-level GST only — delivery charges are added on the invoice
  const cgstAmt = items.reduce((s, i) => s + i.lineBase * ((i.cgst || 0) / 100), 0);
  const sgstAmt = items.reduce((s, i) => s + i.lineBase * ((i.sgst || 0) / 100), 0);
  const igstAmt = items.reduce((s, i) => s + i.lineBase * ((i.igst || 0) / 100), 0);
  const grandTotal = subTotal + cgstAmt + sgstAmt + igstAmt;

  const columns = [
    { title: '#', render: (_, __, idx) => idx + 1, width: 40 },
    { title: 'Product', dataIndex: 'productName' },
    { title: 'Size', dataIndex: 'size', render: (v) => v || '-', width: 90 },
    { title: 'Description', dataIndex: 'description', render: (v) => v || '-' },
    { title: 'Orig. Price', dataIndex: 'origPrice', render: (v) => `₹ ${fmt(v)}`, align: 'right', width: 90 },
    { title: 'Unit Price', dataIndex: 'price', render: (v) => `₹ ${fmt(v)}`, align: 'right', width: 90 },
    { title: 'Qty', dataIndex: 'quantity', align: 'right', width: 60 },
    ...(isLineLevelGst ? [
      {
        title: 'CGST %', dataIndex: 'cgst', align: 'right', width: 73,
        render: (v) => v != null ? <Text style={{ color: '#1a3a6b' }}>{v}%</Text> : <Text type="secondary">—</Text>,
      },
      {
        title: 'SGST %', dataIndex: 'sgst', align: 'right', width: 73,
        render: (v) => v != null ? <Text style={{ color: '#1a3a6b' }}>{v}%</Text> : <Text type="secondary">—</Text>,
      },
      {
        title: 'IGST %', dataIndex: 'igst', align: 'right', width: 70,
        render: (v) => v != null ? <Text style={{ color: '#1a3a6b' }}>{v}%</Text> : <Text type="secondary">—</Text>,
      },
      {
        title: 'Tax Amt', dataIndex: 'lineTaxAmt', align: 'right', width: 90,
        render: (v) => <Text style={{ color: '#fa8c16' }}>₹ {fmt(v)}</Text>,
      },
    ] : []),
    {
      title: 'Line Total', dataIndex: 'lineTotal', render: (v) => <Text strong>₹ {fmt(v)}</Text>,
      align: 'right', width: 100,
    },
  ];

  return (
    <Card
      title={`Purchase Order: ${order.poNumber || `#${order.orderId}`}`}
      extra={
        <Space wrap size="small">
          <Button icon={<PrinterOutlined />} loading={jobCardLoading} onClick={handleJobCard}>Job Card</Button>
          {!isViewer && !order.fullyInvoiced && (
            <Button icon={<FileTextOutlined />} onClick={() => navigate(`/invoices/new?orderId=${id}`)}>Create Invoice</Button>
          )}
          {!isViewer && (
            <Button icon={<EditOutlined />} onClick={() => navigate(`/orders/${id}/edit`)}>Edit</Button>
          )}
        </Space>
      }
      style={{ maxWidth: 1100 }}
    >
      <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
        <Descriptions.Item label="PO Number">{order.poNumber || '-'}</Descriptions.Item>
        <Descriptions.Item label="PO Date">{order.poDate || '-'}</Descriptions.Item>
        <Descriptions.Item label="Customer">{order.customerName || '-'}</Descriptions.Item>
        <Descriptions.Item label="Status"><Tag color={statusColor}>{order.orderStatus}</Tag></Descriptions.Item>
        <Descriptions.Item label="PO Created">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '-'}</Descriptions.Item>
        <Descriptions.Item label="Shipping Address" span={2}>{order.shippingAddress || '-'}</Descriptions.Item>
      </Descriptions>

      <Divider orientation="left" orientationMargin={0}>Products</Divider>
      <Table
        columns={columns} dataSource={items} pagination={false}
        size="small" bordered scroll={{ x: isLineLevelGst ? 1000 : 700 }}
      />

      <Divider orientation="left" orientationMargin={0}>Summary</Divider>
      <Row justify="end">
        <Col xs={24} sm={10}>
          <div style={{ background: '#fafafa', borderRadius: 8, padding: '16px 20px', border: '1px solid #f0f0f0' }}>
            <Row justify="space-between" style={{ marginBottom: 6 }}>
              <Text>Total</Text>
              <Text strong>₹ {fmt(subTotal)}</Text>
            </Row>
            <Divider style={{ margin: '8px 0' }} />
            {isLineLevelGst && (
              <>
                <Row justify="space-between" style={{ marginBottom: 4 }}>
                  <Text type="secondary">CGST</Text>
                  <Text>₹ {fmt(cgstAmt)}</Text>
                </Row>
                <Row justify="space-between" style={{ marginBottom: 4 }}>
                  <Text type="secondary">SGST</Text>
                  <Text>₹ {fmt(sgstAmt)}</Text>
                </Row>
                <Row justify="space-between" style={{ marginBottom: 8 }}>
                  <Text type="secondary">IGST</Text>
                  <Text>₹ {fmt(igstAmt)}</Text>
                </Row>
                <Divider style={{ margin: '8px 0' }} />
              </>
            )}
            <Row justify="space-between">
              <Text strong style={{ fontSize: 16 }}>Order Total</Text>
              <Text strong style={{ fontSize: 18, color: '#1677ff' }}>₹ {fmt(grandTotal)}</Text>
            </Row>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
              * Delivery charges will be added on the invoice.
            </Text>
          </div>
        </Col>
      </Row>

      <Button style={{ marginTop: 24 }} icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>
        Back to Purchase Orders
      </Button>
    </Card>
  );
}
