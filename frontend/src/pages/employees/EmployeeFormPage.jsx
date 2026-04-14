import { useEffect } from 'react';
import { Form, Input, Button, Card, Select, DatePicker, InputNumber, Row, Col, Divider, message } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../api';

export default function EmployeeFormPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  useEffect(() => {
    if (isEdit) {
      api.get(`/employees/${id}`)
        .then((res) => {
          const data = res.data;
          form.setFieldsValue({
            ...data,
            dateOfJoining: data.dateOfJoining ? dayjs(data.dateOfJoining) : null,
          });
        })
        .catch(() => message.error('Employee not found'));
    }
  }, [id]);

  const onFinish = (values) => {
    const payload = {
      ...values,
      dateOfJoining: values.dateOfJoining ? values.dateOfJoining.format('YYYY-MM-DD') : null,
    };

    const request = isEdit
      ? api.put(`/employees/${id}`, payload)
      : api.post('/employees', payload);

    request
      .then(() => { message.success(isEdit ? 'Employee updated' : 'Employee added'); navigate('/employees'); })
      .catch(() => message.error('Save failed'));
  };

  return (
    <Card title={isEdit ? 'Edit Employee' : 'Add Employee'} style={{ maxWidth: 800 }}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ active: true }}>

        <Divider orientation="left" orientationMargin={0} style={{ marginTop: 0 }}>Personal Information</Divider>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'First name is required' }]}>
              <Input placeholder="Enter first name" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="lastName" label="Last Name">
              <Input placeholder="Enter last name" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" orientationMargin={0}>Contact Details</Divider>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Invalid email' }]}>
              <Input placeholder="e.g. employee@company.com" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="e.g. 9876543210" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name="bloodGroup" label="Blood Group">
              <Select placeholder="Select" allowClear>
                <Select.Option value="A+">A+</Select.Option>
                <Select.Option value="A-">A-</Select.Option>
                <Select.Option value="B+">B+</Select.Option>
                <Select.Option value="B-">B-</Select.Option>
                <Select.Option value="O+">O+</Select.Option>
                <Select.Option value="O-">O-</Select.Option>
                <Select.Option value="AB+">AB+</Select.Option>
                <Select.Option value="AB-">AB-</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="emergencyContact" label="Emergency Contact">
              <Input placeholder="e.g. 9876543210" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="aadharNumber" label="Aadhar Number">
              <Input placeholder="e.g. 1234 5678 9012" maxLength={14} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" orientationMargin={0}>Job Details</Divider>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="designation" label="Designation">
              <Input placeholder="e.g. Printer Operator, Designer" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="department" label="Department">
              <Select placeholder="Select department" allowClear>
                <Select.Option value="Production">Production</Select.Option>
                <Select.Option value="Design">Design</Select.Option>
                <Select.Option value="Sales">Sales</Select.Option>
                <Select.Option value="Accounts">Accounts</Select.Option>
                <Select.Option value="Dispatch">Dispatch</Select.Option>
                <Select.Option value="Admin">Admin</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name="dateOfJoining" label="Date of Joining">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="salary" label="Salary">
              <InputNumber style={{ width: '100%' }} min={0} step={500} prefix="₹" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="active" label="Status">
              <Select>
                <Select.Option value={true}>Active</Select.Option>
                <Select.Option value={false}>Inactive</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" orientationMargin={0}>Address</Divider>
        <Form.Item name="address" label="Street Address">
          <Input.TextArea rows={2} placeholder="Street, Area, Landmark" />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name="city" label="City">
              <Input placeholder="City" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="state" label="State">
              <Input placeholder="State" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="pincode" label="Pincode">
              <Input placeholder="Pincode" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" orientationMargin={0}>Bank Account Details</Divider>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name="bankAccountNumber" label="Account Number">
              <Input placeholder="e.g. 1234567890" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="bankAccountName" label="Account Holder Name">
              <Input placeholder="Name as in bank" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="bankIfsc" label="IFSC Code">
              <Input placeholder="e.g. SBIN0001234" />
            </Form.Item>
          </Col>
        </Row>

        <Divider />
        <Form.Item style={{ marginBottom: 0 }}>
          <Row justify="end" gutter={12}>
            <Col>
              <Button icon={<CloseOutlined />} onClick={() => navigate('/employees')}>Cancel</Button>
            </Col>
            <Col>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                {isEdit ? 'Update Employee' : 'Save Employee'}
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </Card>
  );
}
