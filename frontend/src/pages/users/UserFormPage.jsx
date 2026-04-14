import { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Select, Checkbox, Row, Col, Divider, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api';

// All available permission groups
const PERMISSION_GROUPS = [
  { label: 'Dashboard', perms: [{ value: 'dashboard:view', label: 'View' }] },
  { label: 'Customers', perms: [{ value: 'customers:view', label: 'View' }, { value: 'customers:edit', label: 'Create / Edit' }] },
  { label: 'Products', perms: [{ value: 'products:view', label: 'View' }, { value: 'products:edit', label: 'Create / Edit' }] },
  { label: 'Purchase Orders', perms: [{ value: 'orders:view', label: 'View' }, { value: 'orders:edit', label: 'Create / Edit' }] },
  { label: 'Invoices', perms: [{ value: 'invoices:view', label: 'View' }, { value: 'invoices:edit', label: 'Create / Edit' }] },
  { label: 'Payments', perms: [{ value: 'payments:view', label: 'View' }, { value: 'payments:edit', label: 'Create / Edit' }] },
  { label: 'Employees', perms: [{ value: 'employees:view', label: 'View' }, { value: 'employees:edit', label: 'Create / Edit' }] },
  { label: 'Production Units', perms: [{ value: 'production_units:view', label: 'View' }, { value: 'production_units:edit', label: 'Create / Edit' }] },
  { label: 'Reports', perms: [{ value: 'reports:view', label: 'View' }] },
];

const ALL_PERM_VALUES = PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p.value));
const VIEW_ONLY_VALUES = ALL_PERM_VALUES.filter((p) => p.endsWith(':view'));

export default function UserFormPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { isAdmin, isManager } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const selectedRole = Form.useWatch('role', form);

  useEffect(() => {
    // Only ADMIN can see tenant dropdown (they can assign any tenant)
    if (isAdmin) {
      api.get('/tenants').then((res) => setTenants(res.data)).catch(() => {});
    }
    if (isEdit) {
      api.get(`/users/${id}`)
        .then((res) => {
          form.setFieldsValue({ ...res.data });
          setSelectedPerms(res.data.permissions || []);
        })
        .catch(() => message.error('User not found'));
    }
  }, [id]);

  // When role changes, auto-set default permissions
  useEffect(() => {
    if (!isEdit) {
      if (selectedRole === 'STAFF' || selectedRole === 'MANAGER' || selectedRole === 'ADMIN') {
        setSelectedPerms(ALL_PERM_VALUES);
      } else if (selectedRole === 'VIEWER') {
        setSelectedPerms(VIEW_ONLY_VALUES);
      }
    }
  }, [selectedRole, isEdit]);

  const onFinish = (values) => {
    const payload = { ...values, permissions: selectedPerms };
    if (!payload.tenantId) payload.tenantId = null;
    const request = isEdit ? api.put(`/users/${id}`, payload) : api.post('/users', payload);
    request
      .then(() => { message.success(isEdit ? 'User updated' : 'User created'); navigate('/users'); })
      .catch((err) => message.error(err.response?.data?.message || 'Save failed'));
  };

  // Roles that the current user can assign
  const availableRoles = isAdmin
    ? [
        { value: 'ADMIN', label: 'Admin (Super Admin)' },
        { value: 'MANAGER', label: 'Manager (Tenant Admin)' },
        { value: 'STAFF', label: 'Staff (View + Edit)' },
        { value: 'VIEWER', label: 'Viewer (View Only)' },
      ]
    : [
        // MANAGER can only assign STAFF or VIEWER
        { value: 'STAFF', label: 'Staff (View + Edit)' },
        { value: 'VIEWER', label: 'Viewer (View Only)' },
      ];

  const showPermissions = selectedRole === 'STAFF' || selectedRole === 'VIEWER';

  const handlePermToggle = (perm, checked) => {
    setSelectedPerms((prev) => {
      if (checked) {
        // If enabling an :edit perm, also enable the :view perm
        const toAdd = [perm];
        if (perm.endsWith(':edit')) {
          const viewPerm = perm.replace(':edit', ':view');
          if (!prev.includes(viewPerm)) toAdd.push(viewPerm);
        }
        return [...prev, ...toAdd];
      } else {
        // If disabling a :view perm, also disable the :edit perm
        const toRemove = [perm];
        if (perm.endsWith(':view')) {
          const editPerm = perm.replace(':view', ':edit');
          toRemove.push(editPerm);
        }
        return prev.filter((p) => !toRemove.includes(p));
      }
    });
  };

  const handleSelectAll = () => setSelectedPerms(ALL_PERM_VALUES);
  const handleSelectViewOnly = () => setSelectedPerms(VIEW_ONLY_VALUES);
  const handleClearAll = () => setSelectedPerms([]);

  return (
    <Card title={isEdit ? 'Edit User' : 'New User'} style={{ maxWidth: 700 }}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ role: isManager ? 'STAFF' : 'MANAGER', active: true }}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Required' }]}>
              <Input disabled={isEdit} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="password" label={isEdit ? 'New Password (leave blank to keep)' : 'Password'}
              rules={isEdit ? [] : [{ required: true, message: 'Required' }]}>
              <Input.Password />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="fullName" label="Full Name">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Invalid email' }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name="role" label="Role" rules={[{ required: true }]}>
              <Select options={availableRoles} />
            </Form.Item>
          </Col>
          {isAdmin && (
            <Col xs={24} sm={8}>
              <Form.Item name="tenantId" label="Tenant" extra="Leave empty for Admin users">
                <Select allowClear placeholder="Select tenant">
                  {tenants.map((t) => (
                    <Select.Option key={t.tenantId} value={t.tenantId}>{t.tenantName}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          )}
          <Col xs={24} sm={8}>
            <Form.Item name="active" label="Status">
              <Select>
                <Select.Option value={true}>Active</Select.Option>
                <Select.Option value={false}>Inactive</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Permissions grid — shown for STAFF / VIEWER */}
        {showPermissions && (
          <>
            <Divider orientation="left" orientationMargin={0}>Permissions</Divider>
            <div style={{ marginBottom: 12 }}>
              <Button size="small" type="link" onClick={handleSelectAll}>Select All</Button>
              <Button size="small" type="link" onClick={handleSelectViewOnly}>View Only</Button>
              <Button size="small" type="link" danger onClick={handleClearAll}>Clear All</Button>
            </div>
            <div style={{ background: '#fafafa', borderRadius: 8, padding: '12px 16px', border: '1px solid #f0f0f0' }}>
              {PERMISSION_GROUPS.map((group) => (
                <Row key={group.label} style={{ marginBottom: 8 }} align="middle">
                  <Col xs={8} sm={6}>
                    <strong style={{ fontSize: 13 }}>{group.label}</strong>
                  </Col>
                  <Col xs={16} sm={18}>
                    {group.perms.map((p) => (
                      <Checkbox
                        key={p.value}
                        checked={selectedPerms.includes(p.value)}
                        onChange={(e) => handlePermToggle(p.value, e.target.checked)}
                        style={{ marginRight: 16 }}
                      >
                        {p.label}
                      </Checkbox>
                    ))}
                  </Col>
                </Row>
              ))}
            </div>
          </>
        )}

        <Divider />
        <Form.Item>
          <Button type="primary" htmlType="submit">{isEdit ? 'Update' : 'Create'}</Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/users')}>Cancel</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
