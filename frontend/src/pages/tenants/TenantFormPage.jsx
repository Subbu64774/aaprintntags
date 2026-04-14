import { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Select, DatePicker, Row, Col, Divider, message, Upload, Image } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api';

export default function TenantFormPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    if (isEdit) {
      api.get(`/tenants/${id}`)
        .then((res) => {
          const data = res.data;
          form.setFieldsValue({
            ...data,
            subscriptionStart: data.subscriptionStart ? dayjs(data.subscriptionStart) : null,
            subscriptionEnd: data.subscriptionEnd ? dayjs(data.subscriptionEnd) : null,
          });
          if (data.logoUrl) setLogoPreview(data.logoUrl);
        })
        .catch(() => message.error('Tenant not found'));
    }
  }, [id]);

  const onFinish = async (values) => {
    const payload = {
      ...values,
      subscriptionStart: values.subscriptionStart?.format('YYYY-MM-DD') || null,
      subscriptionEnd: values.subscriptionEnd?.format('YYYY-MM-DD') || null,
    };
    try {
      const res = isEdit
        ? await api.put(`/tenants/${id}`, payload)
        : await api.post('/tenants', payload);
      const tenantId = res.data.tenantId || id;

      // Upload logo if a file was selected
      if (logoFile && tenantId) {
        const formData = new FormData();
        formData.append('file', logoFile);
        await api.post(`/tenants/${tenantId}/logo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      message.success(isEdit ? 'Tenant updated' : 'Tenant created');
      navigate('/tenants');
    } catch {
      message.error('Save failed');
    }
  };

  return (
    <Card title={isEdit ? 'Edit Tenant' : 'Onboard New Tenant'} style={{ maxWidth: 750 }}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ active: true, plan: 'BASIC', country: 'India' }}>
        <h4>Business Information</h4>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name="tenantCode" label="Tenant Code" rules={[{ required: true, message: 'Required' }]}>
              <Input disabled={isEdit} placeholder="e.g. AAPNT" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={16}>
            <Form.Item name="tenantName" label="Business Name" rules={[{ required: true, message: 'Required' }]}>
              <Input placeholder="e.g. AA PRINT N TAGS" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name="businessType" label="Business Type">
              <Select placeholder="Select type" allowClear>
                <Select.Option value="Printing">Printing</Select.Option>
                <Select.Option value="Manufacturing">Manufacturing</Select.Option>
                <Select.Option value="Trading">Trading</Select.Option>
                <Select.Option value="Services">Services</Select.Option>
                <Select.Option value="Retail">Retail</Select.Option>
                <Select.Option value="Other">Other</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="gstNumber" label="GST Number">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="panNumber" label="PAN Number">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="fscLicenseNumber" label="FSC License Number">
                <Input />
                </Form.Item>
           </Col>
        </Row>

        <h4>Contact Details</h4>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name="contactPerson" label="Contact Person">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="contactEmail" label="Email" rules={[{ type: 'email', message: 'Invalid email' }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="phone" label="Phone">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <h4>Address</h4>
        <Form.Item name="address" label="Street Address">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <Form.Item name="city" label="City">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={12} sm={6}>
            <Form.Item name="state" label="State">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={12} sm={6}>
            <Form.Item name="pincode" label="Pincode">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={12} sm={6}>
            <Form.Item name="country" label="Country">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="registeredAddress" label="Registered Address (for Invoices)">
          <Input.TextArea rows={2} placeholder="Registered office address to display on invoices" />
        </Form.Item>

        <h4>Bank Details</h4>
        <Row gutter={16}>
          <Col xs={24} sm={6}>
            <Form.Item name="bankName" label="Bank Name">
              <Input placeholder="e.g. Indian Bank" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="bankAccountName" label="Account Holder Name">
              <Input placeholder="Name as in bank" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="bankAccountNumber" label="Account Number">
              <Input placeholder="Account number" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="bankIfsc" label="IFSC Code">
              <Input placeholder="e.g. IDIB000T052" />
            </Form.Item>
          </Col>
        </Row>

        <h4>Branding</h4>
        <Form.Item label="Tenant Logo">
          <Row gutter={16} align="middle">
            <Col>
              {logoPreview && (
                <img src={logoPreview} alt="Logo" style={{ maxHeight: 60, maxWidth: 180, objectFit: 'contain', border: '1px solid #d9d9d9', borderRadius: 4, padding: 4 }} />
              )}
            </Col>
            <Col>
              <Upload
                accept="image/*"
                maxCount={1}
                beforeUpload={(file) => {
                  setLogoFile(file);
                  setLogoPreview(URL.createObjectURL(file));
                  return false; // prevent auto-upload
                }}
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />}>
                  {logoPreview ? 'Change Logo' : 'Upload Logo'}
                </Button>
              </Upload>
            </Col>
          </Row>
        </Form.Item>
        <Form.Item name="logoUrl" hidden>
          <Input />
        </Form.Item>

        <h4>Subscription</h4>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name="plan" label="Plan">
              <Select>
                <Select.Option value="FREE">Free</Select.Option>
                <Select.Option value="BASIC">Basic</Select.Option>
                <Select.Option value="PRO">Pro</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="subscriptionStart" label="Start Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="subscriptionEnd" label="End Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="active" label="Status">
          <Select>
            <Select.Option value={true}>Active</Select.Option>
            <Select.Option value={false}>Inactive</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">{isEdit ? 'Update' : 'Onboard Tenant'}</Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/tenants')}>Cancel</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
