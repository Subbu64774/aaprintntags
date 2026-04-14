import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Spin, Table, Tag, Segmented, Typography, Space } from 'antd';
import {
  UserOutlined, ShoppingCartOutlined, AppstoreOutlined, TeamOutlined,
  FileTextOutlined, DollarOutlined, RiseOutlined, FallOutlined,
} from '@ant-design/icons';
import { Column, Pie } from '@ant-design/charts';
import api from '../../api';

const { Text, Title } = Typography;
const fmt = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  PENDING: '#faad14', PROCESSING: '#1677ff', COMPLETED: '#52c41a', CANCELLED: '#ff4d4f',
  PARTIALLY_INVOICED: '#13c2c2', UNKNOWN: '#d9d9d9',
  PAID: '#52c41a', PARTIALLY_PAID: '#faad14', UNPAID: '#ff4d4f',
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('thisMonth');

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      api.get('/dashboard/analytics'),
    ])
      .then(([statsRes, analyticsRes]) => {
        setStats(statsRes.data);
        setAnalytics(analyticsRes.data);
      })
      .catch(() => {
        setStats({ totalCustomers: '-', totalOrders: '-', totalProducts: '-', totalEmployees: '-', totalInvoices: '-' });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const periodData = analytics?.[period] || {};
  const trend = analytics?.monthlyTrend || [];
  const orderStatusDist = analytics?.orderStatusDistribution || [];
  const invoicePayDist = analytics?.invoicePaymentDistribution || [];
  const topCustomers = analytics?.topCustomers || [];
  const recentInvoices = analytics?.recentInvoices || [];

  // ── Chart data for Column chart (monthly trend) ──
  const trendChartData = trend.flatMap((m) => [
    { month: m.month, type: 'Invoiced', value: m.invoiced },
    { month: m.month, type: 'Collected', value: m.collected },
  ]);

  const columnConfig = {
    data: trendChartData,
    xField: 'month',
    yField: 'value',
    colorField: 'type',
    group: true,
    style: { radiusTopLeft: 4, radiusTopRight: 4 },
    scale: { color: { range: ['#1677ff', '#52c41a'] } },
    axis: { y: { labelFormatter: (v) => '₹' + (v / 1000).toFixed(0) + 'k' } },
    height: 300,
    legend: { position: 'top-right' },
    interaction: { tooltip: { render: (e, { title, items }) => {
      let html = `<div style="padding:8px 12px"><strong>${title}</strong>`;
      items.forEach(i => { html += `<div style="margin-top:4px"><span style="color:${i.color}">●</span> ${i.name}: <strong>₹${fmt(i.value)}</strong></div>`; });
      return html + '</div>';
    }}},
  };

  // ── Pie: Order Status ──
  const orderPieConfig = {
    data: orderStatusDist.map(d => ({ status: d.status, count: d.count })),
    angleField: 'count',
    colorField: 'status',
    radius: 0.9,
    innerRadius: 0.55,
    height: 260,
    label: { text: 'count', style: { fontWeight: 700, fontSize: 14 } },
    legend: { position: 'bottom', itemName: { style: { fontSize: 12 } } },
    scale: { color: { range: orderStatusDist.map(d => STATUS_COLORS[d.status] || '#8c8c8c') } },
    annotations: [{ type: 'text', style: { text: 'PO Status', x: '50%', y: '50%', textAlign: 'center', fontSize: 13, fontWeight: 600, fill: '#666' } }],
  };

  // ── Pie: Invoice Payment Status ──
  const invoicePieConfig = {
    data: invoicePayDist.map(d => ({ status: d.status, count: d.count })),
    angleField: 'count',
    colorField: 'status',
    radius: 0.9,
    innerRadius: 0.55,
    height: 260,
    label: { text: 'count', style: { fontWeight: 700, fontSize: 14 } },
    legend: { position: 'bottom', itemName: { style: { fontSize: 12 } } },
    scale: { color: { range: invoicePayDist.map(d => STATUS_COLORS[d.status] || '#8c8c8c') } },
    annotations: [{ type: 'text', style: { text: 'Payments', x: '50%', y: '50%', textAlign: 'center', fontSize: 13, fontWeight: 600, fill: '#666' } }],
  };

  // ── Top Customers bar ──
  const topCustConfig = {
    data: [...topCustomers].reverse(),
    xField: 'amount',
    yField: 'customer',
    height: 260,
    style: { radiusTopRight: 6, radiusBottomRight: 6, fill: '#1677ff' },
    axis: { x: { labelFormatter: (v) => '₹' + (v / 1000).toFixed(0) + 'k' } },
    label: { text: (d) => '₹' + fmt(d.amount), style: { fill: '#fff', fontWeight: 600 } },
  };

  const recentColumns = [
    { title: 'Invoice #', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'Date', dataIndex: 'invoiceDate', key: 'invoiceDate' },
    { title: 'Customer', dataIndex: 'customerName', key: 'customerName', ellipsis: true },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v) => `₹${fmt(v)}`, align: 'right' },
    { title: 'Payment', dataIndex: 'paymentStatus', key: 'paymentStatus',
      render: (s) => <Tag color={STATUS_COLORS[s] || 'default'}>{s || 'UNPAID'}</Tag> },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
      </Row>

      {/* ── Entity Counts ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderLeft: '3px solid #1677ff' }}>
            <Statistic title="Customers" value={stats?.totalCustomers} prefix={<UserOutlined />} valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderLeft: '3px solid #fa8c16' }}>
            <Statistic title="Purchase Orders" value={stats?.totalOrders} prefix={<ShoppingCartOutlined />} valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderLeft: '3px solid #52c41a' }}>
            <Statistic title="Products" value={stats?.totalProducts} prefix={<AppstoreOutlined />} valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderLeft: '3px solid #722ed1' }}>
            <Statistic title="Employees" value={stats?.totalEmployees} prefix={<TeamOutlined />} valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderLeft: '3px solid #13c2c2' }}>
            <Statistic title="Invoices" value={stats?.totalInvoices} prefix={<FileTextOutlined />} valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
      </Row>

      {/* ── Period Summary Cards ── */}
      <Card size="small" style={{ marginBottom: 20 }}
        title={<Space><DollarOutlined /> Revenue Summary</Space>}
        extra={<Segmented value={period} onChange={setPeriod}
          options={[
            { label: 'This Week', value: 'thisWeek' },
            { label: 'This Month', value: 'thisMonth' },
            { label: 'This Year', value: 'thisYear' },
          ]} />}
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: '#f0f5ff', border: '1px solid #adc6ff' }}>
              <Statistic title="Purchase Orders" value={periodData.orderCount || 0}
                suffix={<Text type="secondary" style={{ fontSize: 12 }}> / ₹{fmt(periodData.totalOrderAmount)}</Text>}
                prefix={<ShoppingCartOutlined />} valueStyle={{ fontSize: 20, color: '#1677ff' }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: '#fff7e6', border: '1px solid #ffd591' }}>
              <Statistic title="Invoiced" value={periodData.invoiceCount || 0}
                suffix={<Text type="secondary" style={{ fontSize: 12 }}> / ₹{fmt(periodData.totalInvoiced)}</Text>}
                prefix={<FileTextOutlined />} valueStyle={{ fontSize: 20, color: '#fa8c16' }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <Statistic title="Collected" value={periodData.paymentCount || 0}
                suffix={<Text type="secondary" style={{ fontSize: 12 }}> / ₹{fmt(periodData.totalCollected)}</Text>}
                prefix={<RiseOutlined />} valueStyle={{ fontSize: 20, color: '#52c41a' }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: (periodData.outstanding || 0) > 0 ? '#fff2e8' : '#f6ffed',
              border: (periodData.outstanding || 0) > 0 ? '1px solid #ffbb96' : '1px solid #b7eb8f' }}>
              <Statistic title="Outstanding" value={`₹${fmt(periodData.outstanding)}`}
                prefix={(periodData.outstanding || 0) > 0 ? <FallOutlined /> : <RiseOutlined />}
                valueStyle={{ fontSize: 20, color: (periodData.outstanding || 0) > 0 ? '#cf1322' : '#52c41a' }} />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* ── Monthly Revenue Trend ── */}
      <Card size="small" title="Monthly Revenue Trend (12 Months)" style={{ marginBottom: 20 }}>
        {trendChartData.length > 0 ? <Column {...columnConfig} /> : <Text type="secondary">No data available</Text>}
      </Card>

      {/* ── Pie Charts Row ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} md={8}>
          <Card size="small" title="PO Status Distribution">
            {orderStatusDist.length > 0 ? <Pie {...orderPieConfig} /> : <Text type="secondary">No data</Text>}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" title="Invoice Payment Status">
            {invoicePayDist.length > 0 ? <Pie {...invoicePieConfig} /> : <Text type="secondary">No data</Text>}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" title="Top 5 Customers (This Year)">
            {topCustomers.length > 0 ? (
              <Column {...topCustConfig} />
            ) : <Text type="secondary">No data</Text>}
          </Card>
        </Col>
      </Row>

      {/* ── Recent Invoices Table ── */}
      <Card size="small" title="Recent Invoices" style={{ marginBottom: 20 }}>
        <Table
          rowKey="invoiceNumber"
          dataSource={recentInvoices}
          columns={recentColumns}
          pagination={false}
          size="small"
          scroll={{ x: 500 }}
        />
      </Card>
    </div>
  );
}
