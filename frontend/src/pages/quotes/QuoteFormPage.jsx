import { useEffect, useState, useCallback } from 'react';
import {
  Form, Input, InputNumber, Button, Select, Switch, Row, Col,
  Card, Divider, message, Spin, Typography, DatePicker,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../api';

const { Text } = Typography;
const fmtNum = (v) => Number(v || 0).toFixed(2);

const emptyItem = () => ({
  _key: Math.random(),
  productName: '', description: '',
  quantity: 1, price: 0, totalPrice: 0,
  cgst: 0, sgst: 0, igst: 0,
  cgstAmount: 0, sgstAmount: 0, igstAmount: 0, lineTotal: 0,
});

function computeItem(item, includeGst) {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.price) || 0;
  const tp = qty * price;
  if (includeGst) {
    const ca = tp * (Number(item.cgst) || 0) / 100;
    const sa = tp * (Number(item.sgst) || 0) / 100;
    const ia = tp * (Number(item.igst) || 0) / 100;
    return { ...item, totalPrice: tp, cgstAmount: ca, sgstAmount: sa, igstAmount: ia, lineTotal: tp + ca + sa + ia };
  }
  return { ...item, totalPrice: tp, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, lineTotal: tp };
}

export default function QuoteFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [form] = Form.useForm();

  const [loading, setSaving2]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [includeGst, setIncludeGst] = useState(false);
  const [items, setItems]       = useState([emptyItem()]);
  const [customerOptions, setCustomerOptions]     = useState([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer]   = useState(null);

  const subTotal   = items.reduce((s, i) => s + (Number(i.totalPrice) || 0), 0);
  const totalCgst  = includeGst ? items.reduce((s, i) => s + (Number(i.cgstAmount) || 0), 0) : 0;
  const totalSgst  = includeGst ? items.reduce((s, i) => s + (Number(i.sgstAmount) || 0), 0) : 0;
  const totalIgst  = includeGst ? items.reduce((s, i) => s + (Number(i.igstAmount) || 0), 0) : 0;
  const grandTotal = subTotal + totalCgst + totalSgst + totalIgst;

  useEffect(() => {
    if (!isEdit) return;
    setSaving2(true);
    api.get(`/quotes/${id}`)
      .then((res) => {
        const q = res.data;
        setIncludeGst(q.includeGst);
        form.setFieldsValue({
          quoteDate:          q.quoteDate ? dayjs(q.quoteDate) : null,
          validityDays:       q.validityDays,
          status:             q.status || 'DRAFT',
          remarks:            q.remarks,
          adhocCustomerName:  q.adhocCustomerName,
          adhocCustomerEmail: q.adhocCustomerEmail,
          adhocCustomerPhone: q.adhocCustomerPhone,
          adhocCustomerGst:   q.adhocCustomerGst,
          customerId:         q.customerId || undefined,
        });
        if (q.customerId) {
          const c = { customerId: q.customerId, customerName: q.customerName, email: q.customerEmail, phone: q.customerPhone, gstNumber: q.customerGst };
          setSelectedCustomer(c);
          setCustomerOptions([{ value: q.customerId, label: q.customerName, data: c }]);
        }
        if (q.quoteItems?.length > 0) setItems(q.quoteItems.map(i => ({ ...i, _key: Math.random() })));
      })
      .catch(() => message.error('Failed to load quote'))
      .finally(() => setSaving2(false));
  }, [id]);

  const handleCustomerSearch = useCallback((val) => {
    if (!val) return;
    setCustomerSearching(true);
    api.get('/customers/search', { params: { q: val } })
      .then((res) => setCustomerOptions((res.data || []).map(c => ({ value: c.customerId, label: c.customerName, data: c }))))
      .catch(() => {})
      .finally(() => setCustomerSearching(false));
  }, []);

  const handleCustomerSelect = (value, option) => {
    const c = option.data;
    setSelectedCustomer(c);
    form.setFieldsValue({ customerId: c.customerId, adhocCustomerName: undefined, adhocCustomerEmail: undefined, adhocCustomerPhone: undefined, adhocCustomerGst: undefined });
  };

  const updateItem = (key, field, value) =>
    setItems(prev => prev.map(it => it._key !== key ? it : computeItem({ ...it, [field]: value }, includeGst)));

  const addItem    = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (key) => setItems(prev => prev.filter(it => it._key !== key));

  const handleGstToggle = (checked) => {
    setIncludeGst(checked);
    setItems(prev => prev.map(it => computeItem(it, checked)));
  };

  const handleSubmit = async () => {
    try { await form.validateFields(); } catch { message.warning('Please fill in all required fields'); return; }
    const validLines = items.filter(i => i.productName?.trim());
    if (!validLines.length) { message.warning('Please add at least one line item'); return; }

    const values = form.getFieldsValue();
    const payload = {
      quoteId:            isEdit ? Number(id) : undefined,
      quoteDate:          values.quoteDate ? values.quoteDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      validityDays:       values.validityDays,
      status:             values.status || 'DRAFT',
      remarks:            values.remarks,
      includeGst,
      customerId:         selectedCustomer ? selectedCustomer.customerId : null,
      adhocCustomerName:  !selectedCustomer ? values.adhocCustomerName  : null,
      adhocCustomerEmail: !selectedCustomer ? values.adhocCustomerEmail : null,
      adhocCustomerPhone: !selectedCustomer ? values.adhocCustomerPhone : null,
      adhocCustomerGst:   !selectedCustomer ? values.adhocCustomerGst   : null,
      quoteItems: validLines.map(i => ({
        quoteItemId: i.quoteItemId || null,
        productName: i.productName.trim(),
        description: i.description || '',
        quantity:    Number(i.quantity) || 0,
        price:       Number(i.price)    || 0,
        cgst: includeGst ? (Number(i.cgst) || 0) : 0,
        sgst: includeGst ? (Number(i.sgst) || 0) : 0,
        igst: includeGst ? (Number(i.igst) || 0) : 0,
      })),
    };

    setSaving(true);
    (isEdit ? api.put(`/quotes/${id}`, payload) : api.post('/quotes', payload))
      .then((res) => { message.success(isEdit ? 'Quote updated!' : 'Quote created!'); navigate(`/quotes/${res.data.quoteId}`); })
      .catch(() => message.error('Failed to save quote'))
      .finally(() => setSaving(false));
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <Card title={isEdit ? 'Edit Quotation' : 'New Quotation'} style={{ maxWidth: 1200 }}>
      <Form form={form} layout="vertical" initialValues={{ status: 'DRAFT', validityDays: 30 }}>

        {/* ── Quote Info ── */}
        <Divider orientation="left" orientationMargin={0} style={{ marginTop: 0 }}>
          Quotation Information
        </Divider>
        <Row gutter={16}>
          <Col xs={24} sm={6}>
            <Form.Item name="quoteDate" label="Quote Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="validityDays" label="Validity (days)" rules={[{ required: true, message: 'Required' }]}>
              <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g. 30" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="status" label="Status">
              <Select options={[
                { value: 'DRAFT',    label: 'Draft'    },
                { value: 'SENT',     label: 'Sent'     },
                { value: 'ACCEPTED', label: 'Accepted' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'EXPIRED',  label: 'Expired'  },
              ]} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item label="GST on this Quote">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                <Switch checked={includeGst} onChange={handleGstToggle} />
                <Text style={{ color: includeGst ? '#1677ff' : '#8c8c8c', fontWeight: 500 }}>
                  {includeGst ? 'With GST' : 'Without GST'}
                </Text>
              </div>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="remarks" label="Remarks">
              <Input.TextArea rows={2} placeholder="Optional remarks or special instructions..." />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Customer ── */}
        <Divider orientation="left" orientationMargin={0}>Customer Information</Divider>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name="customerId" label="Search Existing Customer">
              <Select
                showSearch allowClear
                placeholder="Type to search customer..."
                filterOption={false}
                loading={customerSearching}
                onSearch={handleCustomerSearch}
                onSelect={handleCustomerSelect}
                onClear={() => { setSelectedCustomer(null); form.setFieldsValue({ customerId: undefined }); }}
                options={customerOptions}
                notFoundContent={customerSearching ? <Spin size="small" /> : 'Type to search...'}
              />
            </Form.Item>
          </Col>
        </Row>

        {selectedCustomer ? (
          <div style={{ background: '#f0f5ff', border: '1px solid #d6e4ff', borderRadius: 6, padding: '10px 16px', marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 12 }}>Name</Text><br /><Text strong>{selectedCustomer.customerName}</Text></Col>
              <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 12 }}>Phone</Text><br /><Text>{selectedCustomer.phone || '-'}</Text></Col>
              <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 12 }}>Email</Text><br /><Text>{selectedCustomer.email || '-'}</Text></Col>
              <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 12 }}>GSTIN</Text><br /><Text>{selectedCustomer.gstNumber || '-'}</Text></Col>
            </Row>
          </div>
        ) : (
          <Row gutter={16}>
            <Col xs={24} sm={6}>
              <Form.Item name="adhocCustomerName" label="Customer Name" rules={[{ required: true, message: 'Customer name is required' }]}>
                <Input placeholder="Enter customer name *" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="adhocCustomerPhone" label="Phone">
                <Input placeholder="Phone number" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="adhocCustomerEmail" label="Email">
                <Input placeholder="Email address" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="adhocCustomerGst" label="GSTIN">
                <Input placeholder="GST number" />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* ── Line Items ── */}
        <Divider orientation="left" orientationMargin={0}>
          Products / Services
          {includeGst && <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>(GST columns active)</Text>}
        </Divider>

        {/* Column header labels */}
        <div style={{ display: 'flex', gap: 6, padding: '0 8px 4px', fontSize: 11, color: '#8c8c8c', fontWeight: 500 }}>
          <span style={{ flex: '0 0 22%' }}>Product / Service *</span>
          <span style={{ flex: '0 0 18%' }}>Description</span>
          <span style={{ flex: '0 0 7%',  textAlign: 'right' }}>Qty</span>
          <span style={{ flex: '0 0 9%',  textAlign: 'right' }}>Price ₹</span>
          <span style={{ flex: '0 0 9%',  textAlign: 'right' }}>Amount ₹</span>
          {includeGst && <>
            <span style={{ flex: '0 0 7%', textAlign: 'center' }}>CGST%</span>
            <span style={{ flex: '0 0 7%', textAlign: 'center' }}>SGST%</span>
            <span style={{ flex: '0 0 7%', textAlign: 'center' }}>IGST%</span>
            <span style={{ flex: '0 0 9%', textAlign: 'right' }}>Total ₹</span>
          </>}
          <span style={{ flex: '0 0 24px' }} />
        </div>

        {items.map((item) => (
          <div key={item._key} style={{
            display: 'flex', gap: 6, alignItems: 'flex-end',
            padding: '8px 8px 2px', marginBottom: 8,
            background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6,
          }}>
            <div style={{ flex: '0 0 22%' }}>
              <Input placeholder="Product / service name *" size="small"
                value={item.productName} onChange={(e) => updateItem(item._key, 'productName', e.target.value)} />
            </div>
            <div style={{ flex: '0 0 18%' }}>
              <Input placeholder="Description (optional)" size="small"
                value={item.description} onChange={(e) => updateItem(item._key, 'description', e.target.value)} />
            </div>
            <div style={{ flex: '0 0 7%' }}>
              <InputNumber min={0} size="small" style={{ width: '100%' }}
                value={item.quantity} onChange={(v) => updateItem(item._key, 'quantity', v)} />
            </div>
            <div style={{ flex: '0 0 9%' }}>
              <InputNumber min={0} precision={2} size="small" style={{ width: '100%' }}
                value={item.price} onChange={(v) => updateItem(item._key, 'price', v)} />
            </div>
            <div style={{ flex: '0 0 9%' }}>
              <InputNumber value={parseFloat(fmtNum(item.totalPrice))} disabled size="small"
                style={{ width: '100%', background: '#f0f0f0', fontWeight: 600 }} />
            </div>
            {includeGst && <>
              <div style={{ flex: '0 0 7%' }}>
                <InputNumber min={0} max={100} precision={2} size="small" controls={false} style={{ width: '100%' }}
                  value={item.cgst} onChange={(v) => updateItem(item._key, 'cgst', v)} />
              </div>
              <div style={{ flex: '0 0 7%' }}>
                <InputNumber min={0} max={100} precision={2} size="small" controls={false} style={{ width: '100%' }}
                  value={item.sgst} onChange={(v) => updateItem(item._key, 'sgst', v)} />
              </div>
              <div style={{ flex: '0 0 7%' }}>
                <InputNumber min={0} max={100} precision={2} size="small" controls={false} style={{ width: '100%' }}
                  value={item.igst} onChange={(v) => updateItem(item._key, 'igst', v)} />
              </div>
              <div style={{ flex: '0 0 9%' }}>
                <InputNumber value={parseFloat(fmtNum(item.lineTotal))} disabled size="small"
                  style={{ width: '100%', background: '#f0f0f0', fontWeight: 600 }} />
              </div>
            </>}
            <div style={{ flex: '0 0 24px', paddingBottom: 2 }}>
              <MinusCircleOutlined
                onClick={() => items.length > 1 && removeItem(item._key)}
                style={{ color: items.length > 1 ? '#ff4d4f' : '#d9d9d9', fontSize: 16, cursor: items.length > 1 ? 'pointer' : 'default' }}
              />
            </div>
          </div>
        ))}

        <Button type="dashed" onClick={addItem} icon={<PlusOutlined />} block style={{ marginBottom: 16 }}>
          Add Product / Service
        </Button>

        {/* ── Summary ── */}
        <Divider orientation="left" orientationMargin={0}>Summary</Divider>
        <Row gutter={24} justify="end">
          <Col xs={24} sm={12}>
            <div style={{ background: '#fafafa', borderRadius: 8, padding: '16px 20px', border: '1px solid #f0f0f0' }}>
              <Row justify="space-between" style={{ marginBottom: 4 }}>
                <Text>Sub Total</Text>
                <Text strong>₹ {fmtNum(subTotal)}</Text>
              </Row>
              {includeGst && <>
                <Divider style={{ margin: '6px 0' }} />
                <Row justify="space-between" style={{ marginBottom: 2 }}>
                  <Text type="secondary">CGST</Text>
                  <Text strong style={{ color: '#1a3a6b' }}>₹ {fmtNum(totalCgst)}</Text>
                </Row>
                <Row justify="space-between" style={{ marginBottom: 2 }}>
                  <Text type="secondary">SGST</Text>
                  <Text strong style={{ color: '#1a3a6b' }}>₹ {fmtNum(totalSgst)}</Text>
                </Row>
                <Row justify="space-between" style={{ marginBottom: 4 }}>
                  <Text type="secondary">IGST</Text>
                  <Text strong style={{ color: '#1a3a6b' }}>₹ {fmtNum(totalIgst)}</Text>
                </Row>
              </>}
              <Divider style={{ margin: '6px 0' }} />
              <Row justify="space-between">
                <Text strong style={{ fontSize: 16 }}>Grand Total</Text>
                <Text strong style={{ fontSize: 18, color: '#1677ff' }}>₹ {fmtNum(grandTotal)}</Text>
              </Row>
            </div>
          </Col>
        </Row>

        <Divider />
        <Form.Item style={{ marginBottom: 0 }}>
          <Row justify="end" gutter={12}>
            <Col><Button icon={<CloseOutlined />} onClick={() => navigate('/quotes')}>Cancel</Button></Col>
            <Col>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSubmit}>
                {isEdit ? 'Update Quote' : 'Create Quote'}
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </Card>
  );
}

