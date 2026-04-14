import { useEffect } from 'react';
import { Form, Input, Button, Card, Row, Col, Divider, message } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

export default function CustomerFormPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  useEffect(() => {
    if (isEdit) {
      api.get(`/customers/${id}`)
        .then((res) => form.setFieldsValue(res.data))
        .catch(() => message.error('Customer not found'));
    }
  }, [id]);

  const onFinish = (values) => {
    const request = isEdit
      ? api.put(`/customers/${id}`, values)
      : api.post('/customers', values);

    request
      .then(() => { message.success(isEdit ? 'Customer updated' : 'Customer created'); navigate('/customers'); })
      .catch(() => message.error('Save failed'));
  };

  return (
    <Card title={isEdit ? 'Edit Customer' : 'New Customer'} style={{ maxWidth: 800 }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>

        <Divider orientation="left" orientationMargin={0} style={{ marginTop: 0 }}>Basic Information</Divider>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="customerName" label="Customer Name" rules={[{ required: true, message: 'Name is required' }]}>
              <Input placeholder="Enter customer name" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="gstNumber" label="GST Number">
              <Input placeholder="e.g. 33AABCU9603R1ZM" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" orientationMargin={0}>Contact Details</Divider>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="e.g. 9876543210" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Invalid email' }]}>
              <Input placeholder="e.g. customer@example.com" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" orientationMargin={0}>Addresses</Divider>
        <Form.Item name="currentAddress" label="Current Address">
          <Input.TextArea rows={2} placeholder="Street, Area, Landmark" />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="billingAddress" label="Billing Address">
              <Input.TextArea rows={2} placeholder="Billing address" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="deliveryAddress" label="Delivery Address">
              <Input.TextArea rows={2} placeholder="Delivery address" />
            </Form.Item>
          </Col>
        </Row>

        <Divider />
        <Form.Item style={{ marginBottom: 0 }}>
          <Row justify="end" gutter={12}>
            <Col>
              <Button icon={<CloseOutlined />} htmlType="submit" onClick={() => navigate('/customers')}>
                Cancel
              </Button>
            </Col>
            <Col>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                {isEdit ? 'Update Customer' : 'Save Customer'}
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </Card>
  );
}

