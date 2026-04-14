import { useEffect, useState } from 'react';
import { Card, Button, Spin, Tag, message, Row, Col, Typography } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import {
  EditOutlined, ArrowLeftOutlined,
  UserOutlined, BankOutlined, EnvironmentOutlined, MedicineBoxOutlined,
} from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

const { Text } = Typography;

/* ── Reusable label / value row ───────────────────────────── */
function InfoRow({ label, value, valueStyle }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      padding: '8px 14px',
      borderBottom: '1px solid #f0f0f0',
      gap: 12,
      alignItems: 'flex-start',
      minHeight: 36,
    }}>
      <span style={{
        flex: '0 0 130px',
        color: '#8c8c8c',
        fontSize: 12,
        fontWeight: 500,
        lineHeight: '20px',
        paddingTop: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <span style={{
        flex: 1,
        minWidth: 0,
        fontSize: 13,
        color: '#222',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        lineHeight: '20px',
        ...valueStyle,
      }}>
        {value ?? <span style={{ color: '#bbb' }}>—</span>}
      </span>
    </div>
  );
}

/* ── Section card wrapper ─────────────────────────────────── */
function Section({ title, icon, iconColor, children }) {
  return (
    <Card
      size="small"
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: iconColor }}>{icon}</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
        </span>
      }
      styles={{ body: { padding: 0 } }}
      style={{ height: '100%' }}
    >
      {children}
    </Card>
  );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function EmployeeViewPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { isViewer } = useAuth();
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    api.get(`/employees/${id}`)
      .then(r => setEmployee(r.data))
      .catch(() => message.error('Employee not found'));
  }, [id]);

  if (!employee) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();

  return (
    <div style={{ maxWidth: 820 }}>

      {/* ── Header ── */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '14px 20px' } }}>
        <Row justify="space-between" align="middle" wrap={false}>
          <Col style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: 20, display: 'block', lineHeight: '28px' }}>
              {fullName || '-'}
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {employee.designation || '—'}
              {employee.department ? ` · ${employee.department}` : ''}
            </Text>
          </Col>
          <Col style={{ flexShrink: 0, marginLeft: 12 }}>
            <Tag
              color={employee.active ? 'green' : 'red'}
              style={{ fontSize: 13, padding: '2px 10px', marginRight: 8 }}
            >
              {employee.active ? 'Active' : 'Inactive'}
            </Tag>
            {!isViewer && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => navigate(`/employees/${id}/edit`)}
              >
                Edit
              </Button>
            )}
          </Col>
        </Row>
      </Card>

      {/* ── Sections ── */}
      <Row gutter={[16, 16]}>

        {/* Personal Information */}
        <Col xs={24} md={12}>
          <Section title="Personal Information" icon={<UserOutlined />} iconColor="#1677ff">
            <InfoRow label="First Name"        value={employee.firstName} />
            <InfoRow label="Last Name"         value={employee.lastName} />
            <InfoRow label="Email"             value={employee.email} />
            <InfoRow label="Phone"             value={employee.phone} />
            <InfoRow label="Blood Group"       value={employee.bloodGroup} />
            <InfoRow label="Emergency Contact" value={employee.emergencyContact} />
            <InfoRow label="Aadhar Number"     value={employee.aadharNumber} />
          </Section>
        </Col>

        {/* Employment Details */}
        <Col xs={24} md={12}>
          <Section title="Employment Details" icon={<MedicineBoxOutlined />} iconColor="#52c41a">
            <InfoRow label="Designation"     value={employee.designation} />
            <InfoRow label="Department"      value={employee.department} />
            <InfoRow label="Date of Joining" value={employee.dateOfJoining} />
            <InfoRow
              label="Salary"
              value={
                employee.salary != null
                  ? `₹ ${Number(employee.salary).toLocaleString('en-IN')}`
                  : null
              }
              valueStyle={{ color: '#1677ff', fontWeight: 600 }}
            />
          </Section>
        </Col>

        {/* Address */}
        <Col xs={24} md={12}>
          <Section title="Address" icon={<EnvironmentOutlined />} iconColor="#fa8c16">
            <InfoRow label="Address" value={employee.address} />
            <InfoRow label="City"    value={employee.city} />
            <InfoRow label="State"   value={employee.state} />
            <InfoRow label="Pincode" value={employee.pincode} />
          </Section>
        </Col>

        {/* Bank Details */}
        <Col xs={24} md={12}>
          <Section title="Bank Details" icon={<BankOutlined />} iconColor="#722ed1">
            <InfoRow label="Account Name"   value={employee.bankAccountName} />
            <InfoRow label="Account Number" value={employee.bankAccountNumber} />
            <InfoRow label="IFSC Code"      value={employee.bankIfsc} />
          </Section>
        </Col>

      </Row>

      <Button
        icon={<ArrowLeftOutlined />}
        style={{ marginTop: 16 }}
        onClick={() => navigate('/employees')}
      >
        Back to List
      </Button>
    </div>
  );
}
