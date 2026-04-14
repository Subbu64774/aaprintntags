import { useEffect, useMemo, useState } from 'react';
import {
  Card, Select, DatePicker, Button, Row, Col, Divider, Table,
  Typography, Statistic, Space, Spin, message, Tabs, Tag,
} from 'antd';
import {
  SearchOutlined, FilePdfOutlined, EyeOutlined, BookOutlined,
  ClockCircleOutlined, CheckCircleOutlined, ShoppingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api';
import generateStatementPdf from './statementPdfGenerator';
import generatePendingPdf from './pendingPdfGenerator';
import generateCompletedPdf from './completedPdfGenerator';
import generateOrderReportPdf from './orderReportPdfGenerator';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const fmt = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (v) => Number(v || 0);

const PRESETS = [
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last 1 Month', value: 'last1' },
  { label: 'Last 2 Months', value: 'last2' },
  { label: 'Last 3 Months', value: 'last3' },
  { label: 'Last 6 Months', value: 'last6' },
  { label: 'This Year', value: 'thisYear' },
  { label: 'Last Year', value: 'lastYear' },
  { label: 'Custom Range', value: 'custom' },
];

function getPresetRange(preset) {
  const today = dayjs();
  switch (preset) {
    case 'thisMonth': return [today.startOf('month'), today];
    case 'last1':     return [today.subtract(1, 'month'), today];
    case 'last2':     return [today.subtract(2, 'month'), today];
    case 'last3':     return [today.subtract(3, 'month'), today];
    case 'last6':     return [today.subtract(6, 'month'), today];
    case 'thisYear':  return [today.startOf('year'), today];
    case 'lastYear':  return [today.subtract(1, 'year').startOf('year'), today.subtract(1, 'year').endOf('year')];
    default:          return [today.subtract(1, 'month'), today];
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Shared filter bar used by every tab
───────────────────────────────────────────────────────────────────────── */
function FilterBar({ customers, customerId, setCustomerId, preset, setPreset, dateRange, setDateRange,
                     loading, onSearch, data, pdfLoading, onPdf, pdfViewLoading, onViewPdf }) {
  const handlePresetChange = (val) => {
    setPreset(val);
    if (val !== 'custom') setDateRange(getPresetRange(val));
  };
  return (
    <Row gutter={[16, 12]} align="bottom">
      <Col xs={24} sm={7}>
        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Customer</Text>
        <Select
          showSearch allowClear style={{ width: '100%' }}
          placeholder="All Customers"
          optionFilterProp="label"
          value={customerId}
          onChange={setCustomerId}
          options={customers.map((c) => ({ value: c.customerId, label: c.customerName }))}
        />
      </Col>
      <Col xs={24} sm={5}>
        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Period</Text>
        <Select style={{ width: '100%' }} value={preset} onChange={handlePresetChange} options={PRESETS} />
      </Col>
      <Col xs={24} sm={7}>
        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Date Range</Text>
        <RangePicker
          style={{ width: '100%' }}
          value={dateRange}
          onChange={(val) => { setDateRange(val); setPreset('custom'); }}
        />
      </Col>
      <Col xs={24} sm={5}>
        <Space wrap>
          <Button type="primary" icon={<SearchOutlined />} onClick={onSearch} loading={loading}>
            Generate
          </Button>
          {data && (
            <Button icon={<EyeOutlined />} loading={pdfViewLoading} onClick={onViewPdf}>
              View PDF
            </Button>
          )}
          {data && (
            <Button icon={<FilePdfOutlined />} loading={pdfLoading} onClick={onPdf}>
              Download PDF
            </Button>
          )}
        </Space>
      </Col>
    </Row>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 1 — Ledger Account (Credit/Debit)
───────────────────────────────────────────────────────────────────────── */
function LedgerTab({ customers }) {
  const [customerId, setCustomerId] = useState(null);
  const [preset, setPreset] = useState('thisMonth');
  const [dateRange, setDateRange] = useState(getPresetRange('thisMonth'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfViewLoading, setPdfViewLoading] = useState(false);

  const handleSearch = async () => {
    if (!dateRange?.[0] || !dateRange?.[1]) { message.warning('Select a date range'); return; }
    setLoading(true);
    try {
      const params = { from: dateRange[0].format('YYYY-MM-DD'), to: dateRange[1].format('YYYY-MM-DD') };
      if (customerId) params.customerId = customerId;
      const res = await api.get('/reports/customer-statement', { params });
      setData(res.data);
    } catch { message.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const ledgerEntries = useMemo(() => {
    if (!data) return [];
    const entries = [];
    const invoicePoMap = {};
    const invoiceDateMap = {};
    (data.invoices || []).forEach((inv) => {
      invoicePoMap[inv.invoiceNumber] = inv.poNumber;
      invoiceDateMap[inv.invoiceNumber] = inv.invoiceDate;
    });
    (data.invoices || []).forEach((inv) => {
      entries.push({ key: `inv-${inv.invoiceId}`, createdAt: inv.createdAt, customerName: data.customerName,
        poNumber: inv.poNumber, invoiceDate: inv.invoiceDate, invoiceNumber: inv.invoiceNumber,
        debit: fmtNum(inv.invoiceAmount), credit: null, creditDate: null, status: inv.paymentStatus, type: 'invoice' });
    });
    (data.payments || []).forEach((pay) => {
      entries.push({ key: `pay-${pay.paymentId}`, createdAt: pay.createdAt, customerName: data.customerName,
        poNumber: invoicePoMap[pay.invoiceNumber] || null, invoiceDate: invoiceDateMap[pay.invoiceNumber] || null,
        invoiceNumber: pay.invoiceNumber, debit: null, credit: fmtNum(pay.amount),
        creditDate: pay.paymentDate, type: 'payment' });
    });
    entries.sort((a, b) => {
      const tsA = a.createdAt ? new Date(a.createdAt).getTime() : null;
      const tsB = b.createdAt ? new Date(b.createdAt).getTime() : null;
      if (tsA !== null && tsB !== null) return tsA - tsB;
      if (tsA !== null) return -1;
      if (tsB !== null) return 1;
      return 0;
    });
    let balance = 0;
    entries.forEach((e) => { balance += (e.debit || 0) - (e.credit || 0); e.balance = balance; });
    return entries;
  }, [data]);

  const handlePdf = async () => {
    if (!data) return;
    setPdfLoading(true);
    try { generateStatementPdf(data, { ledgerEntries }, 'download'); }
    catch (e) { console.error(e); message.error('Failed to generate PDF'); }
    finally { setPdfLoading(false); }
  };

  const handleViewPdf = async () => {
    if (!data) return;
    setPdfViewLoading(true);
    try { generateStatementPdf(data, { ledgerEntries }, 'view'); }
    catch (e) { console.error(e); message.error('Failed to open PDF'); }
    finally { setPdfViewLoading(false); }
  };

  const columns = [
    { title: '#', key: 'sno', width: 45, render: (_, __, idx) => idx + 1 },
    { title: 'Customer Name', dataIndex: 'customerName', key: 'customerName', render: (v) => <Text strong>{v || '-'}</Text> },
    { title: 'PO Number', dataIndex: 'poNumber', key: 'poNumber', width: 130, render: (v) => v || <Text type="secondary">—</Text> },
    { title: 'Invoice Date', dataIndex: 'invoiceDate', key: 'invoiceDate', width: 110,
      render: (v) => v ? dayjs(v).format('DD-MMM-YY') : <Text type="secondary">—</Text> },
    { title: 'Invoice Number', dataIndex: 'invoiceNumber', key: 'invoiceNumber', width: 140,
      render: (v) => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text> },
    { title: 'Debit (₹)', dataIndex: 'debit', key: 'debit', align: 'right', width: 120,
      render: (v) => v != null ? <Text strong style={{ color: '#1a3a6b' }}>{fmt(v)}</Text> : <Text type="secondary">—</Text> },
    { title: 'Credit (₹)', dataIndex: 'credit', key: 'credit', align: 'right', width: 120,
      render: (v) => v != null ? <Text strong style={{ color: '#16773a' }}>{fmt(v)}</Text> : <Text type="secondary">—</Text> },
    { title: 'Credit Date', dataIndex: 'creditDate', key: 'creditDate', width: 110,
      render: (v) => v ? dayjs(v).format('DD-MMM-YY') : <Text type="secondary">—</Text> },
  ];

  return (
    <>
      <FilterBar customers={customers} customerId={customerId} setCustomerId={setCustomerId}
        preset={preset} setPreset={setPreset} dateRange={dateRange} setDateRange={setDateRange}
        loading={loading} onSearch={handleSearch} data={data} pdfLoading={pdfLoading} onPdf={handlePdf}
        pdfViewLoading={pdfViewLoading} onViewPdf={handleViewPdf} />

      {loading && <Spin style={{ display: 'block', margin: '60px auto' }} size="large" />}

      {data && !loading && (
        <>
          <div style={{ margin: '20px 0 8px', padding: '10px 16px', background: '#f0f5ff',
            border: '1px solid #adc6ff', borderRadius: 6, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Space size={24} wrap>
              <span><Text type="secondary" style={{ fontSize: 11 }}>Customer</Text><br /><Text strong>{data.customerName}</Text></span>
              <span><Text type="secondary" style={{ fontSize: 11 }}>Period</Text><br /><Text strong>{data.fromDate} to {data.toDate}</Text></span>
            </Space>
            <Space size={24} wrap>
              <span style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Total Debit (Invoiced)</Text><br />
                <Text strong style={{ color: '#1a3a6b', fontSize: 15 }}>₹ {fmt(data.totalInvoiced)}</Text>
              </span>
              <span style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Total Credit (Paid)</Text><br />
                <Text strong style={{ color: '#16773a', fontSize: 15 }}>₹ {fmt(data.totalPaid)}</Text>
              </span>
              <span style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Closing Balance</Text><br />
                <Text strong style={{ color: data.totalOutstanding > 0.01 ? '#cf222e' : '#16773a', fontSize: 15 }}>
                  ₹ {fmt(data.totalOutstanding)} {data.totalOutstanding > 0.01 ? 'Dr' : 'Cr'}
                </Text>
              </span>
            </Space>
          </div>
          <Divider orientation="left" orientationMargin={0} style={{ marginTop: 4 }}>Ledger Account</Divider>
          <Table rowKey="key" dataSource={ledgerEntries} columns={columns} pagination={false} size="small" bordered
            scroll={{ x: 900 }}
            rowClassName={(row) => row.type === 'payment' ? 'ledger-row-credit' : 'ledger-row-debit'}
            summary={() => {
              const totalDebit = ledgerEntries.reduce((s, e) => s + (e.debit || 0), 0);
              const totalCredit = ledgerEntries.reduce((s, e) => s + (e.credit || 0), 0);
              const closing = totalDebit - totalCredit;
              return (
                <>
                  <Table.Summary.Row style={{ background: '#f5f5f5', fontWeight: 600 }}>
                    <Table.Summary.Cell index={0} colSpan={5}><Text strong>Total</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right"><Text strong style={{ color: '#1a3a6b' }}>₹ {fmt(totalDebit)}</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="right"><Text strong style={{ color: '#16773a' }}>₹ {fmt(totalCredit)}</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={7} />
                  </Table.Summary.Row>
                  <Table.Summary.Row style={{ background: closing > 0.01 ? '#fff2e8' : '#f6ffed', fontWeight: 700 }}>
                    <Table.Summary.Cell index={0} colSpan={5}><Text strong>Closing Balance</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      {closing > 0.01 && <Text strong style={{ color: '#cf222e' }}>₹ {fmt(closing)}</Text>}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="right">
                      {closing <= 0.01 && <Text strong style={{ color: '#16773a' }}>₹ {fmt(Math.abs(closing))}</Text>}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="right">
                      <Text strong style={{ color: closing > 0.01 ? '#cf222e' : '#16773a' }}>
                        {closing > 0.01 ? 'Debit Balance (Outstanding)' : 'Credit Balance'}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </>
              );
            }}
          />
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: '#f0f5ff', borderColor: '#adc6ff' }}>
                <Statistic title="Total Invoiced" value={data.totalInvoiced} prefix="₹" precision={2} valueStyle={{ fontSize: 20 }} />
                <Text type="secondary">{data.invoiceCount} invoice(s)</Text>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Statistic title="Total Paid" value={data.totalPaid} prefix="₹" precision={2} valueStyle={{ color: '#3f8600', fontSize: 20 }} />
                <Text type="secondary">{data.paymentCount} payment(s)</Text>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: data.totalOutstanding > 0 ? '#fff2e8' : '#f6ffed', borderColor: data.totalOutstanding > 0 ? '#ffbb96' : '#b7eb8f' }}>
                <Statistic title="Outstanding" value={data.totalOutstanding} prefix="₹" precision={2} valueStyle={{ color: data.totalOutstanding > 0 ? '#cf1322' : '#3f8600', fontSize: 20 }} />
                <Text type="secondary">{(data.pendingInvoices || []).length} pending invoice(s)</Text>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
                <Statistic title="Collection %" value={data.totalInvoiced > 0 ? (data.totalPaid / data.totalInvoiced * 100) : 0}
                  suffix="%" precision={1} valueStyle={{ fontSize: 20 }} />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 2 — Payment Pending
───────────────────────────────────────────────────────────────────────── */
function PaymentPendingTab({ customers }) {
  const [customerId, setCustomerId] = useState(null);
  const [preset, setPreset] = useState('thisMonth');
  const [dateRange, setDateRange] = useState(getPresetRange('thisMonth'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfViewLoading, setPdfViewLoading] = useState(false);

  const handleSearch = async () => {
    if (!dateRange?.[0] || !dateRange?.[1]) { message.warning('Select a date range'); return; }
    setLoading(true);
    try {
      const params = { from: dateRange[0].format('YYYY-MM-DD'), to: dateRange[1].format('YYYY-MM-DD') };
      if (customerId) params.customerId = customerId;
      const res = await api.get('/reports/payment-pending', { params });
      setData(res.data);
    } catch { message.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const handlePdf = async () => {
    if (!data) return;
    setPdfLoading(true);
    try { generatePendingPdf(data, 'download'); }
    catch (e) { console.error(e); message.error('Failed to generate PDF'); }
    finally { setPdfLoading(false); }
  };

  const handleViewPdf = async () => {
    if (!data) return;
    setPdfViewLoading(true);
    try { generatePendingPdf(data, 'view'); }
    catch (e) { console.error(e); message.error('Failed to open PDF'); }
    finally { setPdfViewLoading(false); }
  };

  const columns = [
    { title: '#', key: 'sno', width: 50, render: (_, __, idx) => idx + 1 },
    { title: 'Customer Name', dataIndex: 'customerName', key: 'customerName', render: (v) => <Text strong>{v || '-'}</Text> },
    { title: 'PO Number', dataIndex: 'poNumber', key: 'poNumber', width: 130, render: (v) => v || <Text type="secondary">—</Text> },
    { title: 'Invoice Date', dataIndex: 'invoiceDate', key: 'invoiceDate', width: 110,
      render: (v) => v ? dayjs(v).format('DD-MMM-YY') : <Text type="secondary">—</Text> },
    { title: 'Invoice Number', dataIndex: 'invoiceNumber', key: 'invoiceNumber', width: 140,
      render: (v) => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text> },
    { title: 'Invoice Amt (₹)', dataIndex: 'invoiceAmount', key: 'invoiceAmount', align: 'right', width: 130,
      render: (v) => <Text strong style={{ color: '#1a3a6b' }}>{fmt(v)}</Text> },
    { title: 'Pending Amt (₹)', dataIndex: 'pendingAmount', key: 'pendingAmount', align: 'right', width: 130,
      render: (v) => <Text strong style={{ color: '#cf222e' }}>{fmt(v)}</Text> },
    { title: 'Days Pending', dataIndex: 'daysPending', key: 'daysPending', width: 110, align: 'center',
      render: (v) => {
        const days = v ?? 0;
        const color = days > 60 ? 'red' : days > 30 ? 'orange' : days > 14 ? 'gold' : 'default';
        return <Tag color={color}>{days} day{days !== 1 ? 's' : ''}</Tag>;
      },
      sorter: (a, b) => (a.daysPending || 0) - (b.daysPending || 0),
      defaultSortOrder: 'descend',
    },
  ];

  return (
    <>
      <FilterBar customers={customers} customerId={customerId} setCustomerId={setCustomerId}
        preset={preset} setPreset={setPreset} dateRange={dateRange} setDateRange={setDateRange}
        loading={loading} onSearch={handleSearch} data={data} pdfLoading={pdfLoading} onPdf={handlePdf}
        pdfViewLoading={pdfViewLoading} onViewPdf={handleViewPdf} />

      {loading && <Spin style={{ display: 'block', margin: '60px auto' }} size="large" />}

      {data && !loading && (
        <>
          <div style={{ margin: '20px 0 8px', padding: '10px 16px', background: '#fff7e6',
            border: '1px solid #ffd591', borderRadius: 6, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Space size={24} wrap>
              <span><Text type="secondary" style={{ fontSize: 11 }}>Customer</Text><br /><Text strong>{data.customerName}</Text></span>
              <span><Text type="secondary" style={{ fontSize: 11 }}>Period</Text><br /><Text strong>{data.fromDate} to {data.toDate}</Text></span>
            </Space>
            <Space size={24} wrap>
              <span style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Total Invoiced</Text><br />
                <Text strong style={{ color: '#1a3a6b', fontSize: 15 }}>₹ {fmt(data.totalInvoiced)}</Text>
              </span>
              <span style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Total Paid</Text><br />
                <Text strong style={{ color: '#16773a', fontSize: 15 }}>₹ {fmt(data.totalPaid)}</Text>
              </span>
              <span style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Total Pending</Text><br />
                <Text strong style={{ color: '#cf222e', fontSize: 15 }}>₹ {fmt(data.totalPending)}</Text>
              </span>
            </Space>
          </div>

          <Divider orientation="left" orientationMargin={0} style={{ marginTop: 4 }}>Payment Pending — {data.count} Invoice(s)</Divider>

          <Table rowKey="invoiceId" dataSource={data.invoices || []} columns={columns}
            pagination={{ pageSize: 50, showSizeChanger: true }} size="small" bordered scroll={{ x: 950 }}
            summary={() => {
              const rows = data.invoices || [];
              const totalInv = rows.reduce((s, r) => s + (r.invoiceAmount || 0), 0);
              const totalPen = rows.reduce((s, r) => s + (r.pendingAmount || 0), 0);
              return (
                <Table.Summary.Row style={{ background: '#fff2e8', fontWeight: 600 }}>
                  <Table.Summary.Cell index={0} colSpan={5}><Text strong>Total</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right"><Text strong style={{ color: '#1a3a6b' }}>₹ {fmt(totalInv)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right"><Text strong style={{ color: '#cf222e' }}>₹ {fmt(totalPen)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} />
                </Table.Summary.Row>
              );
            }}
          />

          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={12} sm={8}>
              <Card size="small" style={{ background: '#f0f5ff', borderColor: '#adc6ff' }}>
                <Statistic title="Total Invoiced" value={data.totalInvoiced} prefix="₹" precision={2} valueStyle={{ fontSize: 20 }} />
                <Text type="secondary">{data.count} invoice(s)</Text>
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Statistic title="Amount Paid" value={data.totalPaid} prefix="₹" precision={2} valueStyle={{ color: '#3f8600', fontSize: 20 }} />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card size="small" style={{ background: '#fff2e8', borderColor: '#ffbb96' }}>
                <Statistic title="Total Pending" value={data.totalPending} prefix="₹" precision={2} valueStyle={{ color: '#cf1322', fontSize: 20 }} />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 3 — Payment Completed
───────────────────────────────────────────────────────────────────────── */
function PaymentCompletedTab({ customers }) {
  const [customerId, setCustomerId] = useState(null);
  const [preset, setPreset] = useState('thisMonth');
  const [dateRange, setDateRange] = useState(getPresetRange('thisMonth'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfViewLoading, setPdfViewLoading] = useState(false);

  const handleSearch = async () => {
    if (!dateRange?.[0] || !dateRange?.[1]) { message.warning('Select a date range'); return; }
    setLoading(true);
    try {
      const params = { from: dateRange[0].format('YYYY-MM-DD'), to: dateRange[1].format('YYYY-MM-DD') };
      if (customerId) params.customerId = customerId;
      const res = await api.get('/reports/payment-completed', { params });
      setData(res.data);
    } catch { message.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const handlePdf = async () => {
    if (!data) return;
    setPdfLoading(true);
    try { generateCompletedPdf(data, 'download'); }
    catch (e) { console.error(e); message.error('Failed to generate PDF'); }
    finally { setPdfLoading(false); }
  };

  const handleViewPdf = async () => {
    if (!data) return;
    setPdfViewLoading(true);
    try { generateCompletedPdf(data, 'view'); }
    catch (e) { console.error(e); message.error('Failed to open PDF'); }
    finally { setPdfViewLoading(false); }
  };

  const columns = [
    { title: '#', key: 'sno', width: 50, render: (_, __, idx) => idx + 1 },
    { title: 'Customer Name', dataIndex: 'customerName', key: 'customerName', render: (v) => <Text strong>{v || '-'}</Text> },
    { title: 'PO Number', dataIndex: 'poNumber', key: 'poNumber', width: 130, render: (v) => v || <Text type="secondary">—</Text> },
    { title: 'Invoice Date', dataIndex: 'invoiceDate', key: 'invoiceDate', width: 110,
      render: (v) => v ? dayjs(v).format('DD-MMM-YY') : <Text type="secondary">—</Text> },
    { title: 'Invoice Number', dataIndex: 'invoiceNumber', key: 'invoiceNumber', width: 140,
      render: (v) => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text> },
    { title: 'Invoice Amt (₹)', dataIndex: 'invoiceAmount', key: 'invoiceAmount', align: 'right', width: 130,
      render: (v) => <Text strong style={{ color: '#1a3a6b' }}>{fmt(v)}</Text> },
    { title: 'Paid Amt (₹)', dataIndex: 'paidAmount', key: 'paidAmount', align: 'right', width: 130,
      render: (v) => <Text strong style={{ color: '#16773a' }}>{fmt(v)}</Text> },
    { title: 'Remaining Amt (₹)', dataIndex: 'pendingAmount', key: 'pendingAmount', align: 'right', width: 140,
      render: (v) => v > 0.01
        ? <Text strong style={{ color: '#d46b08' }}>{fmt(v)}</Text>
        : <Tag color="green">Fully Paid</Tag>,
    },
  ];

  return (
    <>
      <FilterBar customers={customers} customerId={customerId} setCustomerId={setCustomerId}
        preset={preset} setPreset={setPreset} dateRange={dateRange} setDateRange={setDateRange}
        loading={loading} onSearch={handleSearch} data={data} pdfLoading={pdfLoading} onPdf={handlePdf}
        pdfViewLoading={pdfViewLoading} onViewPdf={handleViewPdf} />

      {loading && <Spin style={{ display: 'block', margin: '60px auto' }} size="large" />}

      {data && !loading && (
        <>
          <div style={{ margin: '20px 0 8px', padding: '10px 16px', background: '#f6ffed',
            border: '1px solid #b7eb8f', borderRadius: 6, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Space size={24} wrap>
              <span><Text type="secondary" style={{ fontSize: 11 }}>Customer</Text><br /><Text strong>{data.customerName}</Text></span>
              <span><Text type="secondary" style={{ fontSize: 11 }}>Period</Text><br /><Text strong>{data.fromDate} to {data.toDate}</Text></span>
            </Space>
            <Space size={24} wrap>
              <span style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Total Invoiced</Text><br />
                <Text strong style={{ color: '#1a3a6b', fontSize: 15 }}>₹ {fmt(data.totalInvoiced)}</Text>
              </span>
              <span style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Total Paid</Text><br />
                <Text strong style={{ color: '#16773a', fontSize: 15 }}>₹ {fmt(data.totalPaid)}</Text>
              </span>
              <span style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Remaining</Text><br />
                <Text strong style={{ color: data.totalPending > 0.01 ? '#d46b08' : '#16773a', fontSize: 15 }}>₹ {fmt(data.totalPending)}</Text>
              </span>
            </Space>
          </div>

          <Divider orientation="left" orientationMargin={0} style={{ marginTop: 4 }}>Payment Completed — {data.count} Invoice(s)</Divider>

          <Table rowKey="invoiceId" dataSource={data.invoices || []} columns={columns}
            pagination={{ pageSize: 50, showSizeChanger: true }} size="small" bordered scroll={{ x: 950 }}
            summary={() => {
              const rows = data.invoices || [];
              const totalInv = rows.reduce((s, r) => s + (r.invoiceAmount || 0), 0);
              const totalPaid = rows.reduce((s, r) => s + (r.paidAmount || 0), 0);
              const totalRem = rows.reduce((s, r) => s + (r.pendingAmount || 0), 0);
              return (
                <Table.Summary.Row style={{ background: '#f6ffed', fontWeight: 600 }}>
                  <Table.Summary.Cell index={0} colSpan={5}><Text strong>Total</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right"><Text strong style={{ color: '#1a3a6b' }}>₹ {fmt(totalInv)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right"><Text strong style={{ color: '#16773a' }}>₹ {fmt(totalPaid)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right"><Text strong style={{ color: '#d46b08' }}>₹ {fmt(totalRem)}</Text></Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />

          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: '#f0f5ff', borderColor: '#adc6ff' }}>
                <Statistic title="Total Invoiced" value={data.totalInvoiced} prefix="₹" precision={2} valueStyle={{ fontSize: 20 }} />
                <Text type="secondary">{data.count} invoice(s)</Text>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Statistic title="Total Paid" value={data.totalPaid} prefix="₹" precision={2} valueStyle={{ color: '#3f8600', fontSize: 20 }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: '#fff8f0', borderColor: '#ffd591' }}>
                <Statistic title="Remaining" value={data.totalPending} prefix="₹" precision={2} valueStyle={{ color: '#d46b08', fontSize: 20 }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
                <Statistic title="Collection %" value={data.totalInvoiced > 0 ? (data.totalPaid / data.totalInvoiced * 100) : 0}
                  suffix="%" precision={1} valueStyle={{ fontSize: 20 }} />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 4 — Order Report
───────────────────────────────────────────────────────────────────────── */
function OrderReportTab({ customers }) {
  const [customerId, setCustomerId] = useState(null);
  const [preset, setPreset] = useState('thisMonth');
  const [dateRange, setDateRange] = useState(getPresetRange('thisMonth'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfViewLoading, setPdfViewLoading] = useState(false);

  const handleSearch = async () => {
    if (!dateRange?.[0] || !dateRange?.[1]) { message.warning('Select a date range'); return; }
    setLoading(true);
    try {
      const params = { from: dateRange[0].format('YYYY-MM-DD'), to: dateRange[1].format('YYYY-MM-DD') };
      if (customerId) params.customerId = customerId;
      const res = await api.get('/reports/order-report', { params });
      setData(res.data);
    } catch { message.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const handlePdf = async () => {
    if (!data) return;
    setPdfLoading(true);
    try { generateOrderReportPdf(data, 'download'); }
    catch (e) { console.error(e); message.error('Failed to generate PDF'); }
    finally { setPdfLoading(false); }
  };

  const handleViewPdf = async () => {
    if (!data) return;
    setPdfViewLoading(true);
    try { generateOrderReportPdf(data, 'view'); }
    catch (e) { console.error(e); message.error('Failed to open PDF'); }
    finally { setPdfViewLoading(false); }
  };

  const statusTag = (status) => {
    const map = { Completed: 'success', Cancelled: 'error', Processing: 'processing', Pending: 'warning' };
    return <Tag color={map[status] || 'default'}>{status || 'Pending'}</Tag>;
  };

  const columns = [
    { title: '#', key: 'sno', width: 50, render: (_, __, idx) => idx + 1 },
    { title: 'Customer Name', dataIndex: 'customerName', key: 'customerName', render: (v) => <Text strong>{v || '-'}</Text> },
    { title: 'PO Number', dataIndex: 'poNumber', key: 'poNumber', width: 140, render: (v) => v || <Text type="secondary">—</Text> },
    { title: 'PO Date', dataIndex: 'poDate', key: 'poDate', width: 110,
      render: (v) => v ? dayjs(v).format('DD-MMM-YY') : <Text type="secondary">—</Text>,
      sorter: (a, b) => new Date(a.poDate || 0) - new Date(b.poDate || 0),
    },
    { title: 'Total PO Qty', dataIndex: 'totalQuantity', key: 'totalQuantity', width: 110, align: 'center',
      render: (v) => <Text strong>{v ?? 0}</Text>,
      sorter: (a, b) => (a.totalQuantity || 0) - (b.totalQuantity || 0),
    },
    { title: 'Invoiced Qty', dataIndex: 'invoicedQuantity', key: 'invoicedQuantity', width: 110, align: 'center',
      render: (v, row) => {
        const pct = row.totalQuantity > 0 ? Math.round((v / row.totalQuantity) * 100) : 0;
        return <Space direction="vertical" size={0} style={{ lineHeight: 1.3 }}>
          <Text strong style={{ color: '#1a3a6b' }}>{v ?? 0}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{pct}% of PO</Text>
        </Space>;
      },
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 120, align: 'center',
      render: (v) => statusTag(v),
      filters: [
        { text: 'Pending', value: 'Pending' },
        { text: 'Processing', value: 'Processing' },
        { text: 'Completed', value: 'Completed' },
        { text: 'Cancelled', value: 'Cancelled' },
      ],
      onFilter: (value, record) => record.status === value,
    },
  ];

  return (
    <>
      <FilterBar customers={customers} customerId={customerId} setCustomerId={setCustomerId}
        preset={preset} setPreset={setPreset} dateRange={dateRange} setDateRange={setDateRange}
        loading={loading} onSearch={handleSearch} data={data} pdfLoading={pdfLoading} onPdf={handlePdf}
        pdfViewLoading={pdfViewLoading} onViewPdf={handleViewPdf} />

      {loading && <Spin style={{ display: 'block', margin: '60px auto' }} size="large" />}

      {data && !loading && (
        <>
          <div style={{ margin: '20px 0 8px', padding: '10px 16px', background: '#f9f0ff',
            border: '1px solid #d3adf7', borderRadius: 6, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Space size={24} wrap>
              <span><Text type="secondary" style={{ fontSize: 11 }}>Customer</Text><br /><Text strong>{data.customerName}</Text></span>
              <span><Text type="secondary" style={{ fontSize: 11 }}>Period</Text><br /><Text strong>{data.fromDate} to {data.toDate}</Text></span>
            </Space>
            <Space size={24} wrap>
              <span style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Total Orders</Text><br />
                <Text strong style={{ fontSize: 15 }}>{data.totalOrders}</Text>
              </span>
              <span style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Completed</Text><br />
                <Text strong style={{ color: '#16773a', fontSize: 15 }}>{data.completedOrders}</Text>
              </span>
              <span style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Pending / Processing</Text><br />
                <Text strong style={{ color: '#d46b08', fontSize: 15 }}>{data.pendingOrders}</Text>
              </span>
            </Space>
          </div>

          <Divider orientation="left" orientationMargin={0} style={{ marginTop: 4 }}>Order Report — {data.totalOrders} Order(s)</Divider>

          <Table rowKey="orderId" dataSource={data.orders || []} columns={columns}
            pagination={{ pageSize: 50, showSizeChanger: true }} size="small" bordered scroll={{ x: 800 }}
            summary={() => {
              const rows = data.orders || [];
              const totalQty = rows.reduce((s, r) => s + (r.totalQuantity || 0), 0);
              const invoicedQty = rows.reduce((s, r) => s + (r.invoicedQuantity || 0), 0);
              return (
                <Table.Summary.Row style={{ background: '#f5f5f5', fontWeight: 600 }}>
                  <Table.Summary.Cell index={0} colSpan={4}><Text strong>Total</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="center"><Text strong>{totalQty}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="center"><Text strong style={{ color: '#1a3a6b' }}>{invoicedQty}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="center">
                    <Text strong>{data.completedOrders} completed / {data.pendingOrders} pending</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />

          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: '#f0f5ff', borderColor: '#adc6ff' }}>
                <Statistic title="Total Orders" value={data.totalOrders} valueStyle={{ fontSize: 24 }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Statistic title="Completed" value={data.completedOrders} valueStyle={{ color: '#3f8600', fontSize: 24 }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: '#fff8f0', borderColor: '#ffd591' }}>
                <Statistic title="Pending / Processing" value={data.pendingOrders} valueStyle={{ color: '#d46b08', fontSize: 24 }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
                <Statistic title="Completion %"
                  value={data.totalOrders > 0 ? (data.completedOrders / data.totalOrders * 100) : 0}
                  suffix="%" precision={1} valueStyle={{ fontSize: 24 }} />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Main Reports Page
───────────────────────────────────────────────────────────────────────── */
export default function ReportsPage() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    api.get('/customers/search?q=').then((res) => setCustomers(res.data || [])).catch(() => {});
  }, []);

  const tabItems = [
    {
      key: 'ledger',
      label: <span><BookOutlined /> Ledger Account</span>,
      children: <LedgerTab customers={customers} />,
    },
    {
      key: 'pending',
      label: <span><ClockCircleOutlined /> Payment Pending</span>,
      children: <PaymentPendingTab customers={customers} />,
    },
    {
      key: 'completed',
      label: <span><CheckCircleOutlined /> Payment Completed</span>,
      children: <PaymentCompletedTab customers={customers} />,
    },
    {
      key: 'orders',
      label: <span><ShoppingOutlined /> Order Report</span>,
      children: <OrderReportTab customers={customers} />,
    },
  ];

  return (
    <Card title="Reports" style={{ maxWidth: 1400 }}>
      <Tabs defaultActiveKey="ledger" items={tabItems} destroyInactiveTabPane />
      <style>{`
        .ledger-row-credit td { background: #f6fffb !important; }
        .ledger-row-credit:hover td { background: #e6fff3 !important; }
        .ledger-row-debit td { background: #fff !important; }
        .ledger-row-debit:hover td { background: #f0f5ff !important; }
      `}</style>
    </Card>
  );
}

