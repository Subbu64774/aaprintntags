import { useEffect } from 'react';
import { Form, Input, Button, Card, Select, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api';

export default function ProductionUnitFormPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  useEffect(() => {
    if (isEdit) {
      api.get(`/production-units/${id}`)
        .then((res) => form.setFieldsValue(res.data))
        .catch(() => message.error('Production unit not found'));
    }
  }, [id]);

  const onFinish = (values) => {
    const payload = { ...values, tenantId: user?.tenantId };
    const request = isEdit ? api.put(`/production-units/${id}`, payload) : api.post('/production-units', payload);
    request
      .then(() => { message.success(isEdit ? 'Unit updated' : 'Unit created'); navigate('/production-units'); })
      .catch(() => message.error('Save failed'));
  };

  if (!user?.tenantId) return <p>Please select a tenant first.</p>;

  return (
    <Card title={isEdit ? 'Edit Production Unit' : 'New Production Unit'} style={{ maxWidth: 600 }}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ active: true }}>
        <Form.Item name="unitCode" label="Unit Code">
          <Input />
        </Form.Item>
        <Form.Item name="unitName" label="Unit Name" rules={[{ required: true, message: 'Name is required' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="address" label="Address">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="city" label="City">
          <Input />
        </Form.Item>
        <Form.Item name="state" label="State">
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="Phone">
          <Input />
        </Form.Item>
        <Form.Item name="active" label="Status">
          <Select>
            <Select.Option value={true}>Active</Select.Option>
            <Select.Option value={false}>Inactive</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">{isEdit ? 'Update' : 'Save'}</Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/production-units')}>Cancel</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
