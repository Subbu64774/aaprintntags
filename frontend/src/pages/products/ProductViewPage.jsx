import { useEffect, useState } from 'react';
import { Descriptions, Card, Button, Spin, message } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { EditOutlined } from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function ProductViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isViewer } = useAuth();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    api.get(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch(() => message.error('Product not found'));
  }, [id]);

  if (!product) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <Card
      title={product.productName}
      extra={!isViewer && <Button icon={<EditOutlined />} onClick={() => navigate(`/products/${id}/edit`)}>Edit</Button>}
      style={{ maxWidth: 600 }}
    >
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Size">{product.productSize || '-'}</Descriptions.Item>
        <Descriptions.Item label="Price">{product.productPrice || '-'}</Descriptions.Item>
        <Descriptions.Item label="HSN Code">{product.hsnCode || '-'}</Descriptions.Item>
        <Descriptions.Item label="Additional Works">{product.additionalWorks || '-'}</Descriptions.Item>
      </Descriptions>
      <Button style={{ marginTop: 16 }} onClick={() => navigate('/products')}>Back to List</Button>
    </Card>
  );
}

