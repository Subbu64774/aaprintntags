import { useEffect, useState } from 'react';
import { Descriptions, Card, Button, Spin, message } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { EditOutlined } from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function CustomerViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isViewer } = useAuth();
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    api.get(`/customers/${id}`)
      .then((res) => setCustomer(res.data))
      .catch(() => message.error('Customer not found'));
  }, [id]);

  if (!customer) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <Card
      title={customer.customerName}
      extra={!isViewer && <Button icon={<EditOutlined />} onClick={() => navigate(`/customers/${id}/edit`)}>Edit</Button>}
      style={{ maxWidth: 600 }}
    >
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Phone">{customer.phone || '-'}</Descriptions.Item>
        <Descriptions.Item label="Email">{customer.email || '-'}</Descriptions.Item>
        <Descriptions.Item label="GST Number">{customer.gstNumber || '-'}</Descriptions.Item>
        <Descriptions.Item label="Current Address">{customer.currentAddress || '-'}</Descriptions.Item>
        <Descriptions.Item label="Billing Address">{customer.billingAddress || '-'}</Descriptions.Item>
        <Descriptions.Item label="Delivery Address">{customer.deliveryAddress || '-'}</Descriptions.Item>
      </Descriptions>
      <Button style={{ marginTop: 16 }} onClick={() => navigate('/customers')}>Back to List</Button>
    </Card>
  );
}

