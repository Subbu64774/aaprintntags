import { useEffect, useState, useMemo } from 'react';
import {
  Form, Input, Button, Card, Select, InputNumber, Row, Col,
  Divider, Typography, Spin, DatePicker, message,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../api';

const { Text } = Typography;
const fmt = (v) => (v || 0).toFixed(2);

export default function OrderFormPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => { m[p.productId] = p; });
    return m;
  }, [products]);

  const customerMap = useMemo(() => {
    const m = {};
    customers.forEach((c) => { m[c.customerId] = c; });
    return m;
  }, [customers]);

  const handleCustomerSelect = (customerId) => {
    const customer = customerMap[customerId];
    if (customer) {
      const addr = customer.deliveryAddress || customer.billingAddress || customer.currentAddress || '';
      form.setFieldsValue({ shippingAddress: addr });
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          api.get('/customers/search?q='),
          api.get('/products/search?q='),
        ]);
        setCustomers(custRes.data);
        setProducts(prodRes.data);

        if (isEdit) {
          const orderRes = await api.get(`/orders/${id}`);
          const order = orderRes.data;
          form.setFieldsValue({
            poNumber: order.poNumber,
            poDate: order.poDate ? dayjs(order.poDate) : null,
            customerId: order.customerId,
            orderStatus: order.orderStatus,
            shippingAddress: order.shippingAddress,
            orderProductDTOList: (order.orderProductDTOList || []).map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              size: item.size,
              description: item.description,
              // GST = cgst + sgst (since cgst = sgst = gst/2)
              gst: ((item.cgst || 0) + (item.sgst || 0)),
              igst: item.igst || 0,
            })),
          });
        }
      } catch {
        message.error('Failed to load data');
      } finally {
        setLoadingData(false);
      }
    };
    loadAll();
  }, [id]);

  // Live watchers
  const orderItems         = Form.useWatch('orderProductDTOList', form) || [];
  const selectedCustomerId = Form.useWatch('customerId', form);
  const selectedCustomer   = customerMap[selectedCustomerId] || null;

  // Sub-total = sum of (qty × price)
  const subTotal = useMemo(() =>
    orderItems.reduce((sum, item) => {
      if (!item) return sum;
      return sum + (item.quantity || 0) * (item.price || 0);
    }, 0),
  [orderItems]);

  // Per-line GST aggregates (gst = cgst+sgst, auto-split as cgst=sgst=gst/2)
  const { lineCgst, lineSgst, lineIgst } = useMemo(() => {
    let tc = 0, ts = 0, ti = 0;
    orderItems.forEach((item) => {
      if (!item) return;
      const base = (item.quantity || 0) * (item.price || 0);
      const halfGst = (item.gst || 0) / 2; // CGST = SGST = GST/2
      tc += base * (halfGst / 100);
      ts += base * (halfGst / 100);
      ti += base * ((item.igst || 0) / 100);
    });
    return { lineCgst: tc, lineSgst: ts, lineIgst: ti };
  }, [orderItems]);

  // Grand Total = products sub-total + line-level GST only (delivery charges are on invoice)
  const grandTotal = subTotal + lineCgst + lineSgst + lineIgst;

  // Line total with GST for display (gst = cgst+sgst, igst separate)
  const lineTotal = (item) => {
    if (!item) return 0;
    const base = (item.quantity || 0) * (item.price || 0);
    const gstRate = (item.gst || 0) / 100;   // combined GST (cgst+sgst)
    const igstRate = (item.igst || 0) / 100;
    return base * (1 + gstRate + igstRate);
  };

  const handleProductSelect = (productId, fieldName) => {
    const product = productMap[productId];
    if (product) {
      const items = form.getFieldValue('orderProductDTOList') || [];
      items[fieldName] = {
        ...items[fieldName],
        productId,
        price: parseFloat(product.productPrice) || 0,
        size: product.productSize || '',
      };
      form.setFieldsValue({ orderProductDTOList: [...items] });
    }
  };

  const onFinish = (values) => {
    const { orderProductDTOList: rawItems = [], ...rest } = values;
    const payload = {
      ...rest,
      poDate: values.poDate ? values.poDate.format('YYYY-MM-DD') : null,
      // Transform gst → cgst = gst/2, sgst = gst/2
      orderProductDTOList: rawItems.map(({ gst, igst, ...item }) => ({
        ...item,
        cgst: (gst || 0) / 2,
        sgst: (gst || 0) / 2,
        igst: igst || 0,
      })),
    };
    const request = isEdit ? api.put(`/orders/${id}`, payload) : api.post('/orders', payload);
    request
      .then(() => {
        message.success(isEdit ? 'Purchase order updated' : 'Purchase order created');
        navigate('/orders');
      })
      .catch(() => message.error('Save failed'));
  };

  if (loadingData && isEdit) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <Card title={isEdit ? 'Edit Purchase Order' : 'New Purchase Order'} style={{ maxWidth: 1200 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{}}
      >
        {/* ── PO Info ── */}
        <Divider orientation="left" orientationMargin={0} style={{ marginTop: 0 }}>
          Purchase Order Information
        </Divider>
        <Row gutter={16}>
          <Col xs={24} sm={6}>
            <Form.Item name="poNumber" label="PO Number">
              <Input placeholder="e.g. PO-2026-001" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="poDate" label="PO Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="customerId" label="Customer" rules={[{ required: true, message: 'Select a customer' }]}>
              <Select showSearch placeholder="Search customer"
                filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                onChange={handleCustomerSelect}
              >
                {customers.map((c) => (
                  <Select.Option key={c.customerId} value={c.customerId}>{c.customerName}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="orderStatus" label="Status">
              <Select placeholder="Select status">
                <Select.Option value="PENDING">Pending</Select.Option>
                <Select.Option value="PROCESSING">Processing</Select.Option>
                <Select.Option value="COMPLETED">Completed</Select.Option>
                <Select.Option value="CANCELLED">Cancelled</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Customer quick-info */}
        {selectedCustomer && (
          <div style={{ background: '#f6f8fa', border: '1px solid #e8e8e8', borderRadius: 6, padding: '10px 16px', marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 12 }}>Phone</Text><br /><Text>{selectedCustomer.phone || '-'}</Text></Col>
              <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 12 }}>Email</Text><br /><Text>{selectedCustomer.email || '-'}</Text></Col>
              <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 12 }}>Billing Address</Text><br /><Text>{selectedCustomer.billingAddress || '-'}</Text></Col>
              <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 12 }}>Delivery Address</Text><br /><Text>{selectedCustomer.deliveryAddress || '-'}</Text></Col>
            </Row>
          </div>
        )}

        <Form.Item name="shippingAddress" label="Shipping Address">
          <Input.TextArea rows={2} placeholder="Delivery / shipping address" />
        </Form.Item>

        {/* ── Products ── */}
        <Divider orientation="left" orientationMargin={0}>Products</Divider>

        {/* Column headers */}
        <div style={{ display: 'flex', gap: 6, padding: '0 8px 4px 8px', fontSize: 11, color: '#8c8c8c', fontWeight: 500 }}>
          <span style={{ flex: '0 0 18%' }}>Product *</span>
          <span style={{ flex: '0 0 9%'  }}>Size</span>
          <span style={{ flex: '0 0 17%' }}>Description</span>
          <span style={{ flex: '0 0 8%',  textAlign: 'right' }}>Orig ₹</span>
          <span style={{ flex: '0 0 8%',  textAlign: 'right' }}>Price ₹</span>
          <span style={{ flex: '0 0 6%',  textAlign: 'right' }}>Qty</span>
          <span style={{ flex: '0 0 9%',  textAlign: 'center' }}>GST%</span>
          <span style={{ flex: '0 0 9%',  textAlign: 'center' }}>IGST%</span>
          <span style={{ flex: '0 0 9%',  textAlign: 'right' }}>Total ₹</span>
          <span style={{ flex: '0 0 24px' }} />
        </div>

        <Form.List name="orderProductDTOList">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => {
                const item = orderItems[name] || {};
                const product = productMap[item.productId];
                const origPrice = product ? parseFloat(product.productPrice) || 0 : 0;
                const lt = lineTotal(item);

                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      gap: 6,
                      alignItems: 'flex-end',
                      padding: '8px 8px 2px',
                      marginBottom: 8,
                      background: '#fafafa',
                      border: '1px solid #f0f0f0',
                      borderRadius: 6,
                    }}
                  >
                    {/* Product */}
                    <div style={{ flex: '0 0 18%' }}>
                      <Form.Item {...restField} name={[name, 'productId']}
                        rules={[{ required: true, message: 'Select' }]} style={{ marginBottom: 6 }}>
                        <Select placeholder="Select product" showSearch size="small"
                          filterOption={(input, option) =>
                            option.children.toLowerCase().includes(input.toLowerCase())
                          }
                          onChange={(val) => handleProductSelect(val, name)}
                        >
                          {products.map((p) => (
                            <Select.Option key={p.productId} value={p.productId}>{p.productName}</Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>

                    {/* Size */}
                    <div style={{ flex: '0 0 9%' }}>
                      <Form.Item {...restField} name={[name, 'size']} style={{ marginBottom: 6 }}>
                        <Input placeholder="50×25mm" size="small" />
                      </Form.Item>
                    </div>

                    {/* Description */}
                    <div style={{ flex: '0 0 17%' }}>
                      <Form.Item {...restField} name={[name, 'description']} style={{ marginBottom: 6 }}>
                        <Input placeholder="Colour / material" size="small" />
                      </Form.Item>
                    </div>

                    {/* Orig price (read-only) */}
                    <div style={{ flex: '0 0 8%' }}>
                      <Form.Item style={{ marginBottom: 6 }}>
                        <InputNumber value={origPrice} disabled size="small"
                          style={{ width: '100%', background: '#f0f0f0' }} />
                      </Form.Item>
                    </div>

                    {/* Unit price */}
                    <div style={{ flex: '0 0 8%' }}>
                      <Form.Item {...restField} name={[name, 'price']} style={{ marginBottom: 6 }}>
                        <InputNumber placeholder="Price" min={0} step={0.01} size="small" style={{ width: '100%' }} />
                      </Form.Item>
                    </div>

                    {/* Qty */}
                    <div style={{ flex: '0 0 6%' }}>
                      <Form.Item {...restField} name={[name, 'quantity']}
                        rules={[{ required: true, message: 'Qty' }]} style={{ marginBottom: 6 }}>
                        <InputNumber placeholder="Qty" min={1} size="small" style={{ width: '100%' }} />
                      </Form.Item>
                    </div>

                    {/* GST % (combined — auto-split into CGST + SGST on save) */}
                    <div style={{ flex: '0 0 9%' }}>
                      <Form.Item {...restField} name={[name, 'gst']} style={{ marginBottom: 6 }}>
                        <InputNumber placeholder="0" min={0} max={100} step={0.5}
                          size="small" controls={false} style={{ width: '100%' }} />
                      </Form.Item>
                    </div>

                    {/* IGST % */}
                    <div style={{ flex: '0 0 9%' }}>
                      <Form.Item {...restField} name={[name, 'igst']} style={{ marginBottom: 6 }}>
                        <InputNumber placeholder="0" min={0} max={100} step={0.5}
                          size="small" controls={false} style={{ width: '100%' }} />
                      </Form.Item>
                    </div>

                    {/* Line total (read-only) */}
                    <div style={{ flex: '0 0 9%' }}>
                      <Form.Item style={{ marginBottom: 6 }}>
                        <InputNumber value={parseFloat(lt.toFixed(2))} disabled size="small"
                          style={{ width: '100%', background: '#f0f0f0', fontWeight: 600 }} />
                      </Form.Item>
                    </div>

                    {/* Remove */}
                    <div style={{ flex: '0 0 24px', paddingBottom: 8 }}>
                      <MinusCircleOutlined onClick={() => remove(name)}
                        style={{ color: '#ff4d4f', fontSize: 16, cursor: 'pointer' }} />
                    </div>
                  </div>
                );
              })}
              <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}
                block style={{ marginBottom: 16 }}>
                Add Product
              </Button>
            </>
          )}
        </Form.List>

        {/* ── Summary ── */}
        <Divider orientation="left" orientationMargin={0}>Summary</Divider>
        <Row gutter={24} justify="end">
          <Col xs={24} sm={12}>
            <div style={{ background: '#fafafa', borderRadius: 8, padding: '16px 20px', border: '1px solid #f0f0f0' }}>
              <Row justify="space-between" style={{ marginBottom: 4 }}>
                <Text>Total</Text>
                <Text strong>₹ {fmt(subTotal)}</Text>
              </Row>
              <Divider style={{ margin: '6px 0' }} />
              <Row justify="space-between" style={{ marginBottom: 2 }}>
                <Text type="secondary">CGST (line-level)</Text>
                <Text strong style={{ color: '#1a3a6b' }}>₹ {fmt(lineCgst)}</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 2 }}>
                <Text type="secondary">SGST (line-level)</Text>
                <Text strong style={{ color: '#1a3a6b' }}>₹ {fmt(lineSgst)}</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 4 }}>
                <Text type="secondary">IGST (line-level)</Text>
                <Text strong style={{ color: '#1a3a6b' }}>₹ {fmt(lineIgst)}</Text>
              </Row>
              <Divider style={{ margin: '6px 0' }} />
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

        <Divider />
        <Form.Item style={{ marginBottom: 0 }}>
          <Row justify="end" gutter={12}>
            <Col>
              <Button icon={<CloseOutlined />} onClick={() => navigate('/orders')}>Cancel</Button>
            </Col>
            <Col>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                {isEdit ? 'Update Purchase Order' : 'Create Purchase Order'}
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </Card>
  );
}
