import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const str = (v) => (v == null ? '-' : String(v) || '-');
const fmtDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
};

const navy = [26, 58, 107];
const grey = [102, 102, 102];
const black = [34, 34, 34];
const white = [255, 255, 255];
const red = [207, 34, 46];
const orange = [212, 107, 8];
const lightRed = [255, 242, 232];
const lightOrange = [255, 248, 230];
const tableGrey = [245, 245, 245];

export default function generatePendingPdf(data, action = 'download') {
  const invoices = data.invoices || [];
  const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const ML = 14, MR = 14, CW = W - ML - MR;
  let y = 14;

  const ensureSpace = (h) => {
    if (y + h > H - 18) { pdf.addPage(); y = 14; }
  };

  // ── Company Header ──
  const tenantName = data.tenantName || 'AA PRINT N TAGS';
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(...navy);
  pdf.text(tenantName, W / 2, y + 4, { align: 'center' });
  y += 8;

  const addrParts = [];
  if (data.tenantRegisteredAddress) {
    addrParts.push(data.tenantRegisteredAddress);
  } else {
    if (data.tenantAddress) addrParts.push(data.tenantAddress);
    const cityLine = [data.tenantCity, data.tenantState, data.tenantPincode].filter(Boolean).join(', ');
    if (cityLine) addrParts.push(cityLine);
    if (data.tenantGst) addrParts.push('GSTIN : ' + data.tenantGst);
  }
  if (data.tenantPhone) addrParts.push('Contact : ' + data.tenantPhone);
  if (data.tenantEmail) addrParts.push('E-Mail : ' + data.tenantEmail);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...black);
  addrParts.forEach((line) => { pdf.text(line, W / 2, y + 4, { align: 'center' }); y += 4.5; });

  y += 2;
  pdf.setDrawColor(...navy);
  pdf.setLineWidth(0.5);
  pdf.line(ML, y, W - MR, y);
  y += 5;

  // ── Report Title ──
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...navy);
  pdf.text(data.customerName || 'All Customers', W / 2, y + 4, { align: 'center' });
  y += 7;

  pdf.setFontSize(10);
  pdf.setTextColor(...black);
  pdf.text('Payment Pending Report', W / 2, y + 3, { align: 'center' });
  y += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...grey);
  pdf.text(`${str(data.fromDate)}  to  ${str(data.toDate)}`, W / 2, y + 3, { align: 'center' });
  y += 7;

  pdf.setDrawColor(221, 227, 236);
  pdf.setLineWidth(0.3);
  pdf.line(ML, y, W - MR, y);
  y += 5;

  // ── Table ──
  const tableBody = invoices.map((row, idx) => [
    idx + 1,
    str(row.customerName),
    str(row.poNumber),
    fmtDate(row.invoiceDate),
    str(row.invoiceNumber),
    { content: fmt(row.invoiceAmount), styles: { halign: 'right', fontStyle: 'bold' } },
    { content: fmt(row.pendingAmount), styles: { halign: 'right', textColor: red, fontStyle: 'bold' } },
    { content: String(row.daysPending ?? 0), styles: { halign: 'center', textColor: row.daysPending > 30 ? red : orange } },
  ]);

  const totalInvoiced = invoices.reduce((s, r) => s + (r.invoiceAmount || 0), 0);
  const totalPending = invoices.reduce((s, r) => s + (r.pendingAmount || 0), 0);

  ensureSpace(30);
  autoTable(pdf, {
    startY: y,
    margin: { left: ML, right: MR },
    tableWidth: CW,
    head: [['#', 'Customer Name', 'PO Number', 'Invoice Date', 'Invoice Number', 'Invoice Amt (₹)', 'Pending Amt (₹)', 'Days Pending']],
    body: tableBody,
    foot: [[
      { content: 'Total', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt(totalInvoiced), styles: { halign: 'right', fontStyle: 'bold', textColor: navy } },
      { content: fmt(totalPending), styles: { halign: 'right', fontStyle: 'bold', textColor: red } },
      { content: '' },
    ]],
    theme: 'grid',
    headStyles: { fillColor: navy, textColor: white, fontStyle: 'bold', fontSize: 8, cellPadding: 2.5, halign: 'center' },
    footStyles: { fillColor: tableGrey, fontStyle: 'bold', fontSize: 8, cellPadding: 2.5 },
    styles: { fontSize: 8, cellPadding: 2.2, lineColor: [221, 227, 236], lineWidth: 0.2, textColor: black, overflow: 'linebreak' },
    // Landscape A4 CW = 297 - 14 - 14 = 269mm
    // 8 + 60 + 36 + 25 + 42 + 36 + 36 + 26 = 269mm
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 36 },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 42 },
      5: { cellWidth: 36, halign: 'right' },
      6: { cellWidth: 36, halign: 'right' },
      7: { cellWidth: 26, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [250, 251, 252] },
  });

  y = pdf.lastAutoTable.finalY + 6;

  // ── Summary Cards ──
  ensureSpace(22);
  const cardW = CW / 3 - 3;
  const cardH = 16;
  const drawCard = (label, value, colorFill, colorText, x) => {
    pdf.setFillColor(...colorFill);
    pdf.setDrawColor(...colorText);
    pdf.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(...grey);
    pdf.text(label, x + 4, y + 5);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(...colorText);
    pdf.text('Rs. ' + fmt(value), x + 4, y + 11.5);
  };
  drawCard('Total Invoiced', data.totalInvoiced, [240, 245, 255], navy, ML);
  drawCard('Total Paid', data.totalPaid, [246, 255, 237], [22, 119, 55], ML + cardW + 4);
  drawCard('Total Pending', data.totalPending, lightRed, red, ML + (cardW + 4) * 2);
  y += cardH + 8;

  // ── Footer ──
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(221, 227, 236); pdf.setLineWidth(0.3);
    pdf.line(ML, H - 14, W - MR, H - 14);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
    pdf.text('This is a computer-generated report. ' + tenantName, ML, H - 9);
    pdf.text('Page ' + i + ' of ' + totalPages, W - MR, H - 9, { align: 'right' });
  }

  const safeName = (data.customerName || 'All').replace(/[^a-zA-Z0-9]/g, '_');
  if (action === 'view') {
    window.open(pdf.output('bloburl'), '_blank');
  } else {
    pdf.save(`PaymentPending_${safeName}_${str(data.fromDate)}_to_${str(data.toDate)}.pdf`);
  }
}

