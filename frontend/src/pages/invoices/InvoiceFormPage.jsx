import { useEffect, useState, useMemo } from 'react';
import { Form, Input, Button, Card, Select, InputNumber, Row, Col, Divider, Typography, Spin, DatePicker, Checkbox, Table, Switch, Space, Tag, message } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../api';

const { Text } = Typography;
const fmt = (v) => (v || 0).toFixed(2);

export default function InvoiceFormPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [productionUnits, setProductionUnits] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [billToAddress, setBillToAddress] = useState('');
  const [roundOff, setRoundOff] = useState(false);
  const [isFscInvoice, setIsFscInvoice] = useState(false);

  // Watch live DC fields from form
  const deliveryCharges = Form.useWatch('deliveryCharges', form) || 0;
  const dcGstPct        = Form.useWatch('dcGst', form) || 0;   // combined DC GST (= CGST+SGST)
  const dcIgstPct       = Form.useWatch('dcIgst', form) || 0;

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [ordersRes, puRes] = await Promise.all([
          api.get('/orders?page=0&size=200'),
          api.get('/production-units'),
        ]);
        const allOrders = ordersRes.data.content || [];
        setOrders(allOrders);
        const pus = puRes.data || [];
        setProductionUnits(pus);

        if (pus.length === 1 && !isEdit) {
          form.setFieldsValue({ productionUnitId: pus[0].productionUnitId });
        }

        if (isEdit) {
          const invRes = await api.get(`/invoices/${id}`);
          const inv = invRes.data;
          const ctxRes = await api.get(`/invoices/context/order/${inv.orderId}`);
          const ctx = ctxRes.data;

          setBillToAddress(inv.billToAddress || '');
          setRoundOff(!!inv.roundOff);
          setIsFscInvoice(!!inv.fscInvoice);

          const invoicedMap = {};
          (inv.invoiceProductDTOList || []).forEach((ip) => { invoicedMap[ip.orderProductId] = ip; });

          const merged = (ctx.invoiceProductDTOList || []).map((line) => {
            const match = invoicedMap[line.orderProductId];
            return { ...line, selected: !!match, quantity: match ? match.quantity : line.quantity };
          });
          setLineItems(merged);

          form.setFieldsValue({
            orderId: inv.orderId,
            invoiceDate: inv.invoiceDate ? dayjs(inv.invoiceDate) : dayjs(),
            productionUnitId: inv.productionUnitId,
            shipToAddress: inv.shipToAddress,
            invoiceStatus: inv.invoiceStatus,
            remarks: inv.remarks,
            // DC fields from existing invoice: inv.cgst = CGST rate = DC_GST/2
            deliveryCharges: inv.deliveryCharges || 0,
            dcGst: ((inv.cgst || 0) + (inv.sgst || 0)), // reconstruct combined GST
            dcIgst: inv.igst || 0,
          });
        } else {
          const preOrderId = searchParams.get('orderId');
          if (preOrderId) {
            await loadOrderContext(Number(preOrderId));
            form.setFieldsValue({ orderId: Number(preOrderId), invoiceDate: dayjs() });
          }
        }
      } catch (e) {
        message.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [id]);

  const loadOrderContext = async (orderId) => {
    try {
      const res = await api.get(`/invoices/context/order/${orderId}`);
      const ctx = res.data;
      setLineItems(ctx.invoiceProductDTOList || []);
      setBillToAddress(ctx.billToAddress || '');
      form.setFieldsValue({
        shipToAddress: ctx.shipToAddress,
        // Reset DC fields to 0 for new invoice
        deliveryCharges: 0,
        dcGst: 0,
        dcIgst: 0,
      });
    } catch {
      message.error('Failed to load order details');
    }
  };

  const handleOrderChange = (orderId) => { loadOrderContext(orderId); };

  const toggleSelect = (idx, checked) => {
    setLineItems((prev) => prev.map((item, i) => i === idx ? { ...item, selected: checked } : item));
  };

  const updateQty = (idx, qty) => {
    setLineItems((prev) => prev.map((item, i) => i === idx ? { ...item, quantity: qty } : item));
  };

  // Totals
  const subTotal = useMemo(() =>
    lineItems.filter((i) => i.selected).reduce((sum, i) => sum + (i.quantity || 0) * (i.price || 0), 0),
  [lineItems]);

  const hasValidSelection = useMemo(() =>
    lineItems.some((i) => i.selected && (i.quantity || 0) > 0),
  [lineItems]);

  const isLineLevelGst = lineItems.some(
    (i) => i.cgst != null || i.sgst != null || i.igst != null,
  );

  const sel = lineItems.filter((i) => i.selected);

  // Line-level GST from products
  const lineCgstAmt = sel.reduce((s, i) => s + (i.quantity || 0) * (i.price || 0) * ((i.cgst || 0) / 100), 0);
  const lineSgstAmt = sel.reduce((s, i) => s + (i.quantity || 0) * (i.price || 0) * ((i.sgst || 0) / 100), 0);
  const lineIgstAmt = sel.reduce((s, i) => s + (i.quantity || 0) * (i.price || 0) * ((i.igst || 0) / 100), 0);

  // DC GST (applies only to delivery charges, split as CGST=GST/2, SGST=GST/2)
  const dcCgstAmt = (deliveryCharges || 0) * ((dcGstPct / 2) / 100);
  const dcSgstAmt = (deliveryCharges || 0) * ((dcGstPct / 2) / 100);
  const dcIgstAmt = (deliveryCharges || 0) * ((dcIgstPct) / 100);

  // Combined
  const cgstAmt = lineCgstAmt + dcCgstAmt;
  const sgstAmt = lineSgstAmt + dcSgstAmt;
  const igstAmt = lineIgstAmt + dcIgstAmt;

  const totalBeforeRound = subTotal + (deliveryCharges || 0) + cgstAmt + sgstAmt + igstAmt;
  const roundOffAmount = roundOff ? (Math.round(totalBeforeRound) - totalBeforeRound) : 0;
  const grandTotal = roundOff ? Math.round(totalBeforeRound) : totalBeforeRound;

  const onFinish = (values) => {
    const payload = {
      ...values,
      invoiceDate: values.invoiceDate ? values.invoiceDate.format('YYYY-MM-DD') : null,
      // Map DC form fields to invoice DTO: cgst = dcGst/2, sgst = dcGst/2
      cgst: (values.dcGst || 0) / 2,
      sgst: (values.dcGst || 0) / 2,
      igst: values.dcIgst || 0,
      deliveryCharges: values.deliveryCharges || 0,
      billToAddress,
      roundOff,
      fscInvoice: isFscInvoice,
      invoiceProductDTOList: lineItems.map((item) => ({
        orderProductId: item.orderProductId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        description: item.description,
        hsnCode: item.hsnCode,
        selected: item.selected,
      })),
    };
    // remove the helper form fields
    delete payload.dcGst;
    delete payload.dcIgst;

    const request = isEdit ? api.put(`/invoices/${id}`, payload) : api.post('/invoices', payload);
    request
      .then(() => { message.success(isEdit ? 'Invoice updated' : 'Invoice created'); navigate('/invoices'); })
      .catch(() => message.error('Save failed'));
  };

  const columns = [
    {
      title: '', dataIndex: 'selected', width: 40,
      render: (val, _, idx) => <Checkbox checked={val} onChange={(e) => toggleSelect(idx, e.target.checked)} />,
    },
    { title: 'Product', dataIndex: 'productName' },
    { title: 'Size', dataIndex: 'size', render: (v) => v || '-' },
    { title: 'Description', dataIndex: 'description', render: (v) => v || '-', ellipsis: true },
    { title: 'Ordered', dataIndex: 'orderedQuantity', align: 'right', width: 80 },
    { title: 'Invoiced', dataIndex: 'alreadyInvoicedQty', align: 'right', width: 80 },
    {
      title: 'Remaining', align: 'right', width: 90,
      render: (_, r) => Math.max((r.orderedQuantity || 0) - (r.alreadyInvoicedQty || 0), 0),
    },
    {
      title: 'Invoice Qty', width: 110, align: 'right',
      render: (_, record, idx) => {
        const remaining = Math.max((record.orderedQuantity || 0) - (record.alreadyInvoicedQty || 0), 0);
        return (
          <InputNumber
            size="small" min={0} max={remaining}
            value={record.quantity}
            disabled={!record.selected}
            onChange={(v) => updateQty(idx, v)}
            style={{ width: 90 }}
          />
        );
      },
    },
    { title: 'Price', dataIndex: 'price', align: 'right', render: (v) => `₹ ${fmt(v)}`, width: 90 },
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
          if (!r.selected) return '-';
          const base = (r.quantity || 0) * (r.price || 0);
          const tax = base * (((r.cgst || 0) + (r.sgst || 0) + (r.igst || 0)) / 100);
          return <Text style={{ color: '#fa8c16' }}>₹ {fmt(tax)}</Text>;
        },
      },
    ] : []),
    {
      title: 'Line Total', align: 'right', width: 110,
      render: (_, r) => {
        if (!r.selected) return '-';
        const base = (r.quantity || 0) * (r.price || 0);
        const tax = isLineLevelGst
          ? base * (((r.cgst || 0) + (r.sgst || 0) + (r.igst || 0)) / 100)
          : 0;
        return <Text strong>₹ {fmt(base + tax)}</Text>;
      },
    },
  ];

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <Card title={isEdit ? 'Edit Invoice' : 'New Invoice'} style={{ maxWidth: 1200 }}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ invoiceStatus: 'DRAFT', invoiceDate: dayjs(), deliveryCharges: 0, dcGst: 0, dcIgst: 0 }}>

        <Divider orientation="left" orientationMargin={0} style={{ marginTop: 0 }}>Invoice Details</Divider>
        <Row gutter={16}>
          <Col xs={24} sm={6}>
            <Form.Item name="orderId" label="Purchase Order" rules={[{ required: true, message: 'Select an order' }]}>
              <Select
                showSearch placeholder="Select PO"
                filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                onChange={handleOrderChange}
                disabled={isEdit}
                options={orders
                  .filter((o) => !o.fullyInvoiced || (isEdit && o.orderId === form.getFieldValue('orderId')))
                  .map((o) => ({
                    value: o.orderId,
                    label: `${o.poNumber || 'PO #' + o.orderId} — ${o.customerName || ''}`,
                  }))
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="invoiceDate" label="Invoice Date" rules={[{ required: true, message: 'Select invoice date' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="productionUnitId" label="Production Unit" rules={[{ required: true, message: 'Select production unit' }]}>
              <Select placeholder="Select unit" allowClear>
                {productionUnits.map((pu) => (
                  <Select.Option key={pu.productionUnitId} value={pu.productionUnitId}>
                    {pu.unitName}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="invoiceStatus" label="Status">
              <Select>
                <Select.Option value="DRAFT">Draft</Select.Option>
                <Select.Option value="FINALIZED">Finalized</Select.Option>
                <Select.Option value="CANCELLED">Cancelled</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Addresses */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="Bill To (from Customer)">
              <Input.TextArea rows={2} value={billToAddress} readOnly style={{ background: '#f5f5f5' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="shipToAddress" label="Ship To">
              <Input.TextArea rows={2} placeholder="Shipping address (editable)" />
            </Form.Item>
          </Col>
        </Row>

        <Row justify="space-between" align="middle" style={{ marginBottom: 4 }}>
          <Space>
            <Text>FSC Invoice</Text>
            <Switch size="small" checked={isFscInvoice} onChange={setIsFscInvoice} />
          </Space>
          {isFscInvoice && <Tag color="green">FSC Certified</Tag>}
        </Row>

        {/* Line Items */}
        <Divider orientation="left" orientationMargin={0}>Line Items (select items to invoice)</Divider>
        <Table
          dataSource={lineItems.map((item, idx) => ({ ...item, key: idx }))}
          columns={columns}
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 1000 }}
        />

        {/* Delivery Charges & Summary */}
        <Divider orientation="left" orientationMargin={0} style={{ marginTop: 24 }}>Delivery Charges &amp; Summary</Divider>
        <Row gutter={24}>
          <Col xs={24} sm={12}>
            {/* Delivery Charge inputs */}
            <div style={{ background: '#f6f8fa', border: '1px solid #e8e8e8', borderRadius: 6, padding: '12px 16px', marginBottom: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 8, color: '#1a3a6b' }}>Delivery Charges</Text>
              <Row gutter={12}>
                <Col span={24}>
                  <Form.Item name="deliveryCharges" label="Amount (₹)" style={{ marginBottom: 8 }}>
                    <InputNumber min={0} step={50} style={{ width: '100%' }} placeholder="0.00" />
                  </Form.Item>
                </Col>
              </Row>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                GST is auto-split: CGST = GST/2, SGST = GST/2. Applies to delivery amount only.
              </Text>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="dcGst" label="DC GST %" style={{ marginBottom: 0 }}>
                    <InputNumber min={0} max={100} step={0.5} controls={false} style={{ width: '100%' }} placeholder="0" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="dcIgst" label="DC IGST %" style={{ marginBottom: 0 }}>
                    <InputNumber min={0} max={100} step={0.5} controls={false} style={{ width: '100%' }} placeholder="0" />
                  </Form.Item>
                </Col>
              </Row>
            </div>
            <Form.Item name="remarks" label="Remarks">
              <Input.TextArea rows={2} placeholder="Any remarks or notes" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
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
              {isLineLevelGst && (
                <Row justify="space-between" style={{ marginBottom: 2 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    CGST <span style={{ color: '#999' }}>(lines ₹{fmt(lineCgstAmt)}{dcCgstAmt > 0 ? ` + DC ₹${fmt(dcCgstAmt)}` : ''})</span>
                  </Text>
                  <Text>₹ {fmt(cgstAmt)}</Text>
                </Row>
              )}
              {isLineLevelGst && (
                <Row justify="space-between" style={{ marginBottom: 2 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    SGST <span style={{ color: '#999' }}>(lines ₹{fmt(lineSgstAmt)}{dcSgstAmt > 0 ? ` + DC ₹${fmt(dcSgstAmt)}` : ''})</span>
                  </Text>
                  <Text>₹ {fmt(sgstAmt)}</Text>
                </Row>
              )}
              {igstAmt > 0.001 && (
                <Row justify="space-between" style={{ marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    IGST <span style={{ color: '#999' }}>(lines ₹{fmt(lineIgstAmt)}{dcIgstAmt > 0 ? ` + DC ₹${fmt(dcIgstAmt)}` : ''})</span>
                  </Text>
                  <Text>₹ {fmt(igstAmt)}</Text>
                </Row>
              )}
              <Row justify="space-between" align="middle" style={{ marginBottom: 4 }}>
                <Space>
                  <Text>Round Off</Text>
                  <Switch size="small" checked={roundOff} onChange={setRoundOff} />
                </Space>
                {roundOff && <Text style={{ color: roundOffAmount >= 0 ? '#52c41a' : '#ff4d4f' }}>
                  {roundOffAmount >= 0 ? '+' : ''}{fmt(roundOffAmount)}
                </Text>}
              </Row>
              <Divider style={{ margin: '6px 0' }} />
              <Row justify="space-between">
                <Text strong style={{ fontSize: 16 }}>Grand Total</Text>
                <Text strong style={{ fontSize: 18, color: '#1677ff' }}>₹ {fmt(grandTotal)}</Text>
              </Row>
            </div>
          </Col>
        </Row>

        <Divider />
        <Form.Item style={{ marginBottom: 0 }}>
          <Row justify="end" gutter={12}>
            <Col><Button icon={<CloseOutlined />} onClick={() => navigate('/invoices')}>Cancel</Button></Col>
            <Col>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} disabled={!hasValidSelection}>
                {isEdit ? 'Update Invoice' : 'Create Invoice'}
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </Card>
  );
}

