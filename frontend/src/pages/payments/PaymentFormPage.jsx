import { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Select, InputNumber, Row, Col, DatePicker, Checkbox, Descriptions, Typography, Spin, Divider, message } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../api';

const { Text } = Typography;
const fmt = (v) => (v || 0).toFixed(2);

export default function PaymentFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [balance, setBalance] = useState(0);
  const [payFull, setPayFull] = useState(false);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        // Load finalized invoices that are not fully paid
        const res = await api.get('/invoices?page=0&size=500');
        const eligible = (res.data.content || []).filter(
          (inv) => inv.invoiceStatus === 'FINALIZED' && inv.paymentStatus !== 'PAID'
        );
        setInvoices(eligible);

        // Pre-select invoice if provided
        const preInvoiceId = searchParams.get('invoiceId');
        if (preInvoiceId) {
          const invId = Number(preInvoiceId);
          form.setFieldsValue({ invoiceId: invId });
          await loadInvoiceBalance(invId, eligible);
        }
      } catch {
        message.error('Failed to load invoices');
      } finally {
        setLoading(false);
      }
    };
    loadInvoices();
  }, []);

  const loadInvoiceBalance = async (invoiceId, invoiceList) => {
    const list = invoiceList || invoices;
    const inv = list.find((i) => i.invoiceId === invoiceId);
    setSelectedInvoice(inv || null);
    if (inv) {
      try {
        const res = await api.get(`/payments/invoice/${invoiceId}/balance`);
        setBalance(res.data.balance || 0);
      } catch {
        setBalance((inv.invoiceAmount || 0) - (inv.paidAmount || 0));
      }
    } else {
      setBalance(0);
    }
  };

  const handleInvoiceChange = (invoiceId) => {
    setPayFull(false);
    form.setFieldsValue({ amount: null });
    loadInvoiceBalance(invoiceId);
  };

  const handlePayFullChange = (e) => {
    const checked = e.target.checked;
    setPayFull(checked);
    if (checked) {
      form.setFieldsValue({ amount: Math.round(balance * 100) / 100 });
    } else {
      form.setFieldsValue({ amount: null });
    }
  };

  const onFinish = (values) => {
    const payload = {
      invoiceId: values.invoiceId,
      paymentDate: values.paymentDate ? values.paymentDate.format('YYYY-MM-DD') : null,
      amount: values.amount,
      paymentMode: values.paymentMode,
      referenceNumber: values.referenceNumber,
      remarks: values.remarks,
    };
    api.post('/payments', payload)
      .then(() => { message.success('Payment recorded'); navigate('/payments'); })
      .catch((err) => message.error(err.response?.data || 'Failed to record payment'));
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <Card title="Record Payment" style={{ maxWidth: 800 }}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ paymentDate: dayjs(), paymentMode: 'BANK_TRANSFER' }}>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="invoiceId" label="Invoice" rules={[{ required: true, message: 'Select an invoice' }]}>
              <Select
                showSearch
                placeholder="Search invoice..."
                optionFilterProp="label"
                onChange={handleInvoiceChange}
                options={invoices.map((inv) => ({
                  value: inv.invoiceId,
                  label: `${inv.invoiceNumber} — ${inv.customerName} (Rs.${fmt(inv.invoiceAmount)})`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="paymentDate" label="Payment Date" rules={[{ required: true, message: 'Select date' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="paymentMode" label="Payment Mode" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="CASH">Cash</Select.Option>
                <Select.Option value="UPI">UPI</Select.Option>
                <Select.Option value="BANK_TRANSFER">Bank Transfer</Select.Option>
                <Select.Option value="CHEQUE">Cheque</Select.Option>
                <Select.Option value="OTHER">Other</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Invoice info display */}
        {selectedInvoice && (
          <div style={{ background: '#f6f8fa', border: '1px solid #e8e8e8', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={12} sm={6}>
                <Text type="secondary" style={{ fontSize: 12 }}>Customer</Text>
                <br /><Text strong>{selectedInvoice.customerName}</Text>
              </Col>
              <Col xs={12} sm={6}>
                <Text type="secondary" style={{ fontSize: 12 }}>Invoice Amount</Text>
                <br /><Text strong>₹ {fmt(selectedInvoice.invoiceAmount)}</Text>
              </Col>
              <Col xs={12} sm={6}>
                <Text type="secondary" style={{ fontSize: 12 }}>Already Paid</Text>
                <br /><Text strong style={{ color: '#52c41a' }}>₹ {fmt(selectedInvoice.paidAmount)}</Text>
              </Col>
              <Col xs={12} sm={6}>
                <Text type="secondary" style={{ fontSize: 12 }}>Balance Due</Text>
                <br /><Text strong style={{ color: balance > 0 ? '#ff4d4f' : '#52c41a', fontSize: 16 }}>₹ {fmt(balance)}</Text>
              </Col>
            </Row>
          </div>
        )}

        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="amount"
              label="Payment Amount"
              rules={[
                { required: true, message: 'Enter amount' },
                { type: 'number', min: 0.01, message: 'Amount must be > 0' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.01}
                max={balance || undefined}
                precision={2}
                prefix="₹"
                disabled={payFull}
              />
            </Form.Item>
            {selectedInvoice && (
              <Checkbox checked={payFull} onChange={handlePayFullChange} style={{ marginTop: -12, marginBottom: 12 }}>
                Pay Full Balance (₹ {fmt(balance)})
              </Checkbox>
            )}
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="referenceNumber" label="Reference / Transaction No.">
              <Input placeholder="Cheque no, UTR, etc." />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="remarks" label="Remarks">
              <Input placeholder="Optional notes" />
            </Form.Item>
          </Col>
        </Row>

        <Divider />
        <Row justify="end" gutter={12}>
          <Col><Button icon={<CloseOutlined />} onClick={() => navigate('/payments')}>Cancel</Button></Col>
          <Col>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} disabled={!selectedInvoice || balance <= 0}>
              Record Payment
            </Button>
          </Col>
        </Row>
      </Form>
    </Card>
  );
}

