import { useEffect } from 'react';
import { Form, Input, Button, Card, Row, Col, Divider, message } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

export default function ProductFormPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  useEffect(() => {
    if (isEdit) {
      api.get(`/products/${id}`)
        .then((res) => form.setFieldsValue(res.data))
        .catch(() => message.error('Product not found'));
    }
  }, [id]);

  const onFinish = (values) => {
    const request = isEdit
      ? api.put(`/products/${id}`, values)
      : api.post('/products', values);

    request
      .then(() => { message.success(isEdit ? 'Product updated' : 'Product created'); navigate('/products'); })
      .catch(() => message.error('Save failed'));
  };

  return (
    <Card title={isEdit ? 'Edit Product' : 'New Product'} style={{ maxWidth: 800 }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>

        <Divider orientation="left" orientationMargin={0} style={{ marginTop: 0 }}>Product Details</Divider>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="productName" label="Product Name" rules={[{ required: true, message: 'Name is required' }]}>
              <Input placeholder="Enter product name" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="hsnCode" label="HSN Code">
              <Input placeholder="e.g. 4821" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="productSize" label="Size">
              <Input placeholder="e.g. 100mm x 50mm" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="productPrice" label="Price (₹)">
              <Input placeholder="e.g. 250.00" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" orientationMargin={0}>Additional Info</Divider>
        <Form.Item name="additionalWorks" label="Additional Works">
          <Input.TextArea rows={3} placeholder="Lamination, Die-cutting, Foiling, etc." />
        </Form.Item>

        <Divider />
        <Form.Item style={{ marginBottom: 0 }}>
          <Row justify="end" gutter={12}>
            <Col>
              <Button icon={<CloseOutlined />} onClick={() => navigate('/products')}>Cancel</Button>
            </Col>
            <Col>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                {isEdit ? 'Update Product' : 'Save Product'}
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </Card>
  );
}
