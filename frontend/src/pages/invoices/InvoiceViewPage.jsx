import { useEffect, useState } from 'react';
import { Card, Descriptions, Table, Row, Col, Divider, Typography, Tag, Button, Space, Spin, message } from 'antd';
import { EyeOutlined, EditOutlined, ArrowLeftOutlined, FilePdfOutlined, DollarOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import generateInvoicePdf from './invoicePdfGenerator';
import { useAuth } from '../../context/AuthContext';

const { Text } = Typography;
const fmt = (v) => (v || 0).toFixed(2);

export default function InvoiceViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isViewer } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfViewLoading, setPdfViewLoading] = useState(false);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    api.get(`/invoices/${id}`)
      .then((res) => setInvoice(res.data))
      .catch(() => message.error('Invoice not found'));
    api.get(`/payments/invoice/${id}`)
      .then((res) => setPayments(res.data || []))
      .catch(() => {});
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setPdfLoading(true);
    try {
      await generateInvoicePdf(invoice, 'download');
    } catch (err) {
      console.error('PDF generation error:', err);
      message.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleViewPdf = async () => {
    if (!invoice) return;
    setPdfViewLoading(true);
    try {
      await generateInvoicePdf(invoice, 'view');
    } catch (err) {
      console.error('PDF view error:', err);
      message.error('Failed to open PDF');
    } finally {
      setPdfViewLoading(false);
    }
  };

  if (!invoice) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const statusColor = invoice.invoiceStatus === 'FINALIZED' ? 'green'
    : invoice.invoiceStatus === 'CANCELLED' ? 'red' : 'blue';

  const items = (invoice.invoiceProductDTOList || []).map((item, idx) => ({
    ...item, key: idx, lineBase: (item.quantity || 0) * (item.price || 0),
  }));

  // Detect line-level GST
  const isLineLevelGst = items.some(
    (i) => i.cgst != null || i.sgst != null || i.igst != null,
  );

  const subTotal = items.reduce((s, i) => s + i.lineBase, 0);
  const deliveryCharges = invoice.deliveryCharges || 0;

  // Line-level GST from products
  const lineCgst = items.reduce((s, i) => s + i.lineBase * ((i.cgst || 0) / 100), 0);
  const lineSgst = items.reduce((s, i) => s + i.lineBase * ((i.sgst || 0) / 100), 0);
  const lineIgst = items.reduce((s, i) => s + i.lineBase * ((i.igst || 0) / 100), 0);

  // DC GST (invoice.cgst/sgst/igst applies only to delivery charges)
  const dcCgst = deliveryCharges * ((invoice.cgst || 0) / 100);
  const dcSgst = deliveryCharges * ((invoice.sgst || 0) / 100);
  const dcIgst = deliveryCharges * ((invoice.igst || 0) / 100);

  const cgstAmt = lineCgst + dcCgst;
  const sgstAmt = lineSgst + dcSgst;
  const igstAmt = lineIgst + dcIgst;

  const totalBeforeRound = subTotal + deliveryCharges + cgstAmt + sgstAmt + igstAmt;

  const isRoundOff = !!invoice.roundOff;
  const roundOffAmount = isRoundOff ? (invoice.roundOffAmount || (Math.round(totalBeforeRound) - totalBeforeRound)) : 0;
  const grandTotal = isRoundOff ? Math.round(totalBeforeRound) : totalBeforeRound;

  const columns = [
    { title: '#', render: (_, __, idx) => idx + 1, width: 50 },
    { title: 'Product', dataIndex: 'productName' },
    { title: 'HSN Code', dataIndex: 'hsnCode', render: (v) => v || '-', width: 100 },
    { title: 'Size', dataIndex: 'size', render: (v) => v || '-' },
    { title: 'Description', dataIndex: 'description', render: (v) => v || '-' },
    { title: 'Ordered', dataIndex: 'orderedQuantity', align: 'right', width: 80 },
    { title: 'Invoiced', dataIndex: 'quantity', align: 'right', width: 80 },
    { title: 'Price', dataIndex: 'price', render: (v) => `₹ ${fmt(v)}`, align: 'right', width: 90 },
    ...(isLineLevelGst ? [
      {
        title: 'GST %', align: 'right', width: 75,
        render: (_, r) => {
          const gst = ((r.cgst || 0) + (r.sgst || 0));
          return gst > 0 ? <Tag color="blue" style={{ fontSize: 11 }}>{gst}%</Tag> : <Text type="secondary">—</Text>;
        },
      },
      {
        title: 'IGST %', dataIndex: 'igst', align: 'right', width: 75,
        render: (v) => (v != null && v > 0) ? <Tag color="purple" style={{ fontSize: 11 }}>{v}%</Tag> : <Text type="secondary">—</Text>,
      },
      {
        title: 'Tax Amt', align: 'right', width: 90,
        render: (_, r) => {
          const tax = r.lineBase * (((r.cgst || 0) + (r.sgst || 0) + (r.igst || 0)) / 100);
          return <Text style={{ color: '#fa8c16' }}>₹ {fmt(tax)}</Text>;
        },
      },
    ] : []),
    {
      title: 'Line Total', align: 'right', width: 110,
      render: (_, r) => {
        const tax = isLineLevelGst
          ? r.lineBase * (((r.cgst || 0) + (r.sgst || 0) + (r.igst || 0)) / 100)
          : 0;
        return <Text strong>₹ {fmt(r.lineBase + tax)}</Text>;
      },
    },
  ];

  const payStatusColor = invoice.paymentStatus === 'PAID' ? 'green'
    : invoice.paymentStatus === 'PARTIALLY_PAID' ? 'orange' : 'red';

  return (
    <Card
      title={`Invoice: ${invoice.invoiceNumber}`}
      extra={
        <Space wrap size="small">
          {!isViewer && invoice.invoiceStatus === 'FINALIZED' && invoice.paymentStatus !== 'PAID' && (
            <Button icon={<DollarOutlined />} type="primary" onClick={() => navigate(`/payments/new?invoiceId=${id}`)}>Record Payment</Button>
          )}
          <Button icon={<EyeOutlined />} loading={pdfViewLoading} onClick={handleViewPdf}>View PDF</Button>
          <Button icon={<FilePdfOutlined />} loading={pdfLoading} onClick={handleDownloadPdf}>Download PDF</Button>
          {!isViewer && (
            <Button icon={<EditOutlined />} onClick={() => navigate(`/invoices/${id}/edit`)}>Edit</Button>
          )}
        </Space>
      }
      style={{ maxWidth: 1100 }}
    >
      <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
        <Descriptions.Item label="Invoice Number">{invoice.invoiceNumber}</Descriptions.Item>
        <Descriptions.Item label="Invoice Date">{invoice.invoiceDate || '-'}</Descriptions.Item>
        <Descriptions.Item label="PO Number">{invoice.poNumber || '-'}</Descriptions.Item>
        <Descriptions.Item label="Customer">{invoice.customerName || '-'}</Descriptions.Item>
        <Descriptions.Item label="Production Unit">{invoice.productionUnitName || '-'}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={statusColor}>{invoice.invoiceStatus}</Tag>
          {invoice.fscInvoice && <Tag color="green">FSC</Tag>}
          <Tag color={isLineLevelGst ? 'blue' : 'purple'} style={{ marginLeft: 4 }}>
            {isLineLevelGst ? 'Line GST' : 'Order GST'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Payment"><Tag color={payStatusColor}>{invoice.paymentStatus || 'UNPAID'}</Tag> <Text type="secondary">Paid: ₹{fmt(invoice.paidAmount)} | Bal: ₹{fmt(invoice.balanceAmount)}</Text></Descriptions.Item>
        <Descriptions.Item label="Bill To">{invoice.billToAddress || '-'}</Descriptions.Item>
        <Descriptions.Item label="Ship To">{invoice.shipToAddress || '-'}</Descriptions.Item>
        {invoice.remarks && <Descriptions.Item label="Remarks" span={2}>{invoice.remarks}</Descriptions.Item>}
      </Descriptions>

      <Divider orientation="left" orientationMargin={0}>Line Items</Divider>
      <Table columns={columns} dataSource={items} pagination={false} size="small" bordered scroll={{ x: 700 }} />

      <Divider orientation="left" orientationMargin={0}>Tax &amp; Summary</Divider>
      <Row justify="end">
        <Col xs={24} sm={10}>
          <div style={{ background: '#fafafa', borderRadius: 8, padding: '16px 20px', border: '1px solid #f0f0f0' }}>
            <Row justify="space-between" style={{ marginBottom: 4 }}>
              <Text>Total</Text>
              <Text strong>₹ {fmt(subTotal)}</Text>
            </Row>
            <Row justify="space-between" style={{ marginBottom: 4 }}>
              <Text>Delivery Charges</Text>
              <Text strong>₹ {fmt(deliveryCharges)}</Text>
            </Row>
            <Divider style={{ margin: '6px 0' }} />
            {cgstAmt > 0.001 && (
              <Row justify="space-between" style={{ marginBottom: 2 }}>
                <Text type="secondary">
                  CGST {isLineLevelGst ? '(line-level)' : ''}{dcCgst > 0.001 ? ` + DC (${invoice.cgst || 0}%)` : ''}
                </Text>
                <Text>₹ {fmt(cgstAmt)}</Text>
              </Row>
            )}
            {sgstAmt > 0.001 && (
              <Row justify="space-between" style={{ marginBottom: 2 }}>
                <Text type="secondary">
                  SGST {isLineLevelGst ? '(line-level)' : ''}{dcSgst > 0.001 ? ` + DC (${invoice.sgst || 0}%)` : ''}
                </Text>
                <Text>₹ {fmt(sgstAmt)}</Text>
              </Row>
            )}
            {igstAmt > 0.001 && (
              <Row justify="space-between" style={{ marginBottom: 4 }}>
                <Text type="secondary">
                  IGST {isLineLevelGst ? '(line-level)' : ''}{dcIgst > 0.001 ? ` + DC (${invoice.igst || 0}%)` : ''}
                </Text>
                <Text>₹ {fmt(igstAmt)}</Text>
              </Row>
            )}
            {isRoundOff && (
              <Row justify="space-between" style={{ marginBottom: 4 }}>
                <Text type="secondary">Round Off</Text>
                <Text style={{ color: roundOffAmount >= 0 ? '#52c41a' : '#ff4d4f' }}>
                  {roundOffAmount >= 0 ? '+' : ''}{fmt(roundOffAmount)}
                </Text>
              </Row>
            )}
            <Divider style={{ margin: '6px 0' }} />
            <Row justify="space-between">
              <Text strong style={{ fontSize: 16 }}>Grand Total</Text>
              <Text strong style={{ fontSize: 18, color: '#1677ff' }}>₹ {fmt(grandTotal)}</Text>
            </Row>
          </div>
        </Col>
      </Row>

      {/* Payment History */}
      {payments.length > 0 && (
        <>
          <Divider orientation="left" orientationMargin={0}>Payment History</Divider>
          <Table
            rowKey="paymentId"
            dataSource={payments}
            pagination={false}
            size="small"
            bordered
            scroll={{ x: 600 }}
            columns={[
              { title: 'Payment #', dataIndex: 'paymentNumber' },
              { title: 'Date', dataIndex: 'paymentDate' },
              { title: 'Amount', dataIndex: 'amount', render: (v) => `₹ ${fmt(v)}`, align: 'right' },
              { title: 'Mode', dataIndex: 'paymentMode', render: (m) => <Tag>{m}</Tag> },
              { title: 'Reference', dataIndex: 'referenceNumber', render: (v) => v || '-' },
              { title: 'Remarks', dataIndex: 'remarks', render: (v) => v || '-' },
            ]}
          />
        </>
      )}

      <Button style={{ marginTop: 24 }} icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')}>
        Back to Invoices
      </Button>
    </Card>
  );
}
