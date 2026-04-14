import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const R = 'Rs.';
function fmt(v) {
  return Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function str(v) { return v == null ? '-' : String(v) || '-'; }

function numToWords(n) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function convert(num) {
    if (num === 0) return '';
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + convert(num % 100) : '');
    if (num < 100000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '');
    if (num < 10000000) return convert(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + convert(num % 100000) : '');
    return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + convert(num % 10000000) : '');
  }
  const intPart = Math.floor(Math.abs(n));
  const decPart = Math.round((Math.abs(n) - intPart) * 100);
  let result = (convert(intPart) || 'Zero') + ' Rupees';
  if (decPart > 0) result += ' and ' + convert(decPart) + ' Paise';
  return result + ' Only';
}

function loadImageAsDataUrl(src, timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const timer = setTimeout(() => resolve(null), timeoutMs);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        clearTimeout(timer);
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          resolve(c.toDataURL('image/png'));
        } catch { resolve(null); }
      };
      img.onerror = () => { clearTimeout(timer); resolve(null); };
      img.src = src;
    } catch { clearTimeout(timer); resolve(null); }
  });
}

// action: 'download' | 'view'
export default async function generateQuotePdf(quote, action = 'download') {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const ML = 14, MR = 14;
  const CW = W - ML - MR;
  let y = 14;

  const navy   = [30, 80, 160];
  const brown  = [160, 82, 45];
  const grey   = [120, 120, 120];
  const white  = [255, 255, 255];
  const black  = [30, 30, 30];
  const orange = [200, 120, 20];
  const green  = [40, 140, 70];

  const ensureSpace = (needed) => {
    if (y + needed > H - 16) { pdf.addPage(); y = 14; }
  };

  const logoData = await loadImageAsDataUrl(quote.tenantLogoUrl || '/aaprintntags_logo.png');

  const tn = str(quote.tenantName);
  const customerName = quote.customerId
    ? str(quote.customerName)
    : str(quote.adhocCustomerName);
  const customerPhone = quote.customerId ? str(quote.customerPhone) : str(quote.adhocCustomerPhone);
  const customerEmail = quote.customerId ? str(quote.customerEmail) : str(quote.adhocCustomerEmail);
  const customerGst = quote.customerId ? str(quote.customerGst) : str(quote.adhocCustomerGst);

  // ── Document Title ──
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(...navy);
  pdf.text('QUOTATION', W / 2, y, { align: 'center' }); y += 6;

  // ── Header Box ──
  const headerH = 30;
  pdf.setDrawColor(180, 180, 180); pdf.setLineWidth(0.4);
  pdf.rect(ML, y, CW, headerH);

  const logoW = 22, logoH = 22;
  if (logoData) {
    try { pdf.addImage(logoData, 'PNG', ML + 4, y + (headerH - logoH) / 2, logoW, logoH); } catch {}
  }

  let hy = y + 7;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(...black);
  pdf.text(tn, W - MR - 3, hy, { align: 'right' }); hy += 5;

  if (quote.tenantRegisteredAddress) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...black);
    const al = pdf.splitTextToSize(str(quote.tenantRegisteredAddress), CW - 34).slice(0, 2);
    al.forEach(line => { pdf.text(line, W - MR - 3, hy, { align: 'right' }); hy += 3.5; });
  }
  const peArr = [
    quote.tenantPhone ? 'Ph: ' + str(quote.tenantPhone) : null,
    quote.tenantEmail ? 'Email: ' + str(quote.tenantEmail) : null,
  ].filter(Boolean);
  if (peArr.length) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...black);
    pdf.text(peArr.join('   '), W - MR - 3, hy, { align: 'right' }); hy += 4;
  }
  if (quote.tenantGstNumber) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...black);
    pdf.text('GSTIN: ' + str(quote.tenantGstNumber), W - MR - 3, hy, { align: 'right' });
  }
  y += headerH;

  // ── Two-column strip: Customer | Quote Details ──
  const col1W = Math.floor(CW * 0.55);
  const col2W = CW - col1W;
  const col2X = ML + col1W;
  const colHdrH = 6;
  const infoH = colHdrH + 32;

  pdf.setDrawColor(180, 180, 180); pdf.setLineWidth(0.4);
  pdf.rect(ML, y, CW, infoH);
  pdf.line(col2X, y, col2X, y + infoH);

  [{ x: ML, w: col1W, label: 'Customer Details' }, { x: col2X, w: col2W, label: 'Quotation Details' }]
    .forEach(({ x, w, label }) => {
      pdf.setFillColor(...brown); pdf.rect(x, y, w, colHdrH, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(...white);
      pdf.text(label, x + 3, y + 4.5);
    });

  let c1y = y + colHdrH + 5;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(...black);
  pdf.text(customerName, ML + 3, c1y); c1y += 4.5;
  const detailRow = (label, value, yRef, x = ML + 3) => {
    if (!value || value === '-') return yRef;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...grey);
    pdf.text(label + ':', x, yRef);
    pdf.setTextColor(...black);
    pdf.text(String(value), x + 20, yRef);
    return yRef + 3.8;
  };
  c1y = detailRow('Phone', customerPhone, c1y);
  c1y = detailRow('Email', customerEmail, c1y);
  c1y = detailRow('GSTIN', customerGst, c1y);

  let c2y = y + colHdrH + 5;
  const bdRow = (label, value) => {
    if (!value || value === '-') return;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...grey);
    pdf.text(label, col2X + 3, c2y);
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...black);
    pdf.text(str(value), W - MR - 3, c2y, { align: 'right' });
    c2y += 4.8;
  };
  bdRow('Quote No. :', quote.quoteNumber);
  bdRow('Date :', str(quote.quoteDate));
  bdRow('Valid Until :', str(quote.validUntil));
  bdRow('Validity :', quote.validityDays ? quote.validityDays + ' days' : null);
  bdRow('Status :', quote.status);
  y += infoH + 3;

  // ── Line Items Table ──
  const items = (quote.quoteItems || []).map((item, idx) => ({
    ...item,
    sn: idx + 1,
    tp: Number(item.totalPrice || 0),
    ca: Number(item.cgstAmount || 0),
    sa: Number(item.sgstAmount || 0),
    ia: Number(item.igstAmount || 0),
    lt: Number(item.lineTotal || 0),
  }));

  const includeGst = quote.includeGst;
  const hasCgstSgst = includeGst && items.some(i => (i.cgst || 0) > 0 || (i.sgst || 0) > 0);
  const hasIgst = includeGst && items.some(i => (i.igst || 0) > 0);

  const gstCell = (amt, rate, color) => ({
    content: rate > 0 ? fmt(amt) + '\n(' + rate + '%)' : '-',
    styles: { halign: 'right', textColor: rate > 0 ? color : grey },
  });
  const totStyle = { fontStyle: 'bold', textColor: white, fillColor: navy };

  const subTotal = items.reduce((s, i) => s + i.tp, 0);
  const totalCgst = items.reduce((s, i) => s + i.ca, 0);
  const totalSgst = items.reduce((s, i) => s + i.sa, 0);
  const totalIgst = items.reduce((s, i) => s + i.ia, 0);
  const grandTotal = subTotal + totalCgst + totalSgst + totalIgst;
  const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  if (includeGst) {
    const showIgst = hasIgst;
    const showCgstSgst = hasCgstSgst;
    const headCols = showIgst
      ? ['#', 'Product / Description', 'Qty', 'Price', 'Amount', 'CGST', 'SGST', 'IGST', 'Total']
      : (showCgstSgst
        ? ['#', 'Product / Description', 'Qty', 'Price', 'Amount', 'CGST', 'SGST', 'Total']
        : ['#', 'Product / Description', 'Qty', 'Price', 'Amount', 'Total']);

    const body = items.map(it => {
      const pCell = {
        content: str(it.productName) + (it.description ? '\n' + str(it.description) : ''),
        styles: { fontStyle: 'bold' },
      };
      const base = [
        { content: String(it.sn), styles: { halign: 'center', textColor: grey } },
        pCell,
        { content: String(it.quantity || 0), styles: { halign: 'right' } },
        { content: R + ' ' + fmt(it.price), styles: { halign: 'right' } },
        { content: R + ' ' + fmt(it.tp), styles: { halign: 'right' } },
      ];
      if (showCgstSgst) {
        base.push(gstCell(it.ca, it.cgst || 0, navy));
        base.push(gstCell(it.sa, it.sgst || 0, navy));
      }
      if (showIgst) base.push(gstCell(it.ia, it.igst || 0, navy));
      base.push({ content: R + ' ' + fmt(it.lt), styles: { halign: 'right', fontStyle: 'bold' } });
      return base;
    });

    const totRow = [
      { content: 'Total', colSpan: 2, styles: { ...totStyle, halign: 'right' } },
      { content: String(totalQty), styles: { ...totStyle, halign: 'right' } },
      { content: '', styles: { fillColor: navy } },
      { content: R + ' ' + fmt(subTotal), styles: { ...totStyle, halign: 'right' } },
    ];
    if (showCgstSgst) {
      totRow.push({ content: R + ' ' + fmt(totalCgst), styles: { ...totStyle, halign: 'right' } });
      totRow.push({ content: R + ' ' + fmt(totalSgst), styles: { ...totStyle, halign: 'right' } });
    }
    if (showIgst) totRow.push({ content: R + ' ' + fmt(totalIgst), styles: { ...totStyle, halign: 'right' } });
    totRow.push({ content: R + ' ' + fmt(grandTotal), styles: { ...totStyle, halign: 'right' } });
    body.push(totRow);

    // Column widths: # | Product(auto) | Qty | Price | Amount | CGST | SGST | [IGST] | Total
    const colStylesGst = showIgst ? {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 13, halign: 'right' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 22, halign: 'right' },
    } : showCgstSgst ? {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 13, halign: 'right' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' },
      7: { cellWidth: 24, halign: 'right' },
    } : {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    };

    autoTable(pdf, {
      startY: y, margin: { left: ML, right: MR },
      head: [headCols], body, theme: 'grid',
      headStyles: { fillColor: brown, textColor: white, fontStyle: 'bold', fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: colStylesGst,
      styles: { fontSize: 7.5, cellPadding: 2.2, textColor: black, lineColor: [200, 200, 200], lineWidth: 0.2 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
  } else {
    const body = items.map((it) => [
      { content: String(it.sn), styles: { halign: 'center', textColor: grey } },
      { content: str(it.productName) + (it.description ? '\n' + str(it.description) : ''), styles: { fontStyle: 'bold' } },
      { content: String(it.quantity || 0), styles: { halign: 'right' } },
      { content: R + ' ' + fmt(it.price), styles: { halign: 'right' } },
      { content: R + ' ' + fmt(it.tp), styles: { halign: 'right', fontStyle: 'bold' } },
    ]);
    body.push([
      { content: 'Total', colSpan: 2, styles: { ...totStyle, halign: 'right' } },
      { content: String(totalQty), styles: { ...totStyle, halign: 'right' } },
      { content: '', styles: { fillColor: navy } },
      { content: R + ' ' + fmt(subTotal), styles: { ...totStyle, halign: 'right' } },
    ]);
    autoTable(pdf, {
      startY: y, margin: { left: ML, right: MR },
      head: [['#', 'Product / Description', 'Qty', 'Unit Price', 'Amount']],
      body, theme: 'grid',
      headStyles: { fillColor: brown, textColor: white, fontStyle: 'bold', fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 8,  halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 15, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' },
      },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: black, lineColor: [200, 200, 200], lineWidth: 0.2 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
  }

  y = pdf.lastAutoTable.finalY + 4;

  // ── Summary ──
  ensureSpace(50);
  const sumW = CW * 0.45;
  const sumX = ML + CW - sumW;
  let sy = y;

  pdf.setFillColor(...brown); pdf.rect(sumX, sy, sumW, 6, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...white);
  pdf.text('Amount Summary', sumX + 3, sy + 4.5); sy += 9;

  const sumLine = (label, value, opts = {}) => {
    pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    pdf.setFontSize(opts.big ? 10 : 8.5);
    pdf.setTextColor(...(opts.color || black));
    pdf.text(label, sumX + 3, sy);
    pdf.text(value, sumX + sumW - 3, sy, { align: 'right' });
    sy += opts.gap || 5;
  };

  sumLine('Sub Total', R + ' ' + fmt(subTotal));
  if (includeGst) {
    if (totalCgst > 0.001) sumLine('CGST', R + ' ' + fmt(totalCgst), { color: grey });
    if (totalSgst > 0.001) sumLine('SGST', R + ' ' + fmt(totalSgst), { color: grey });
    if (totalIgst > 0.001) sumLine('IGST', R + ' ' + fmt(totalIgst), { color: grey });
  }
  pdf.setDrawColor(...black); pdf.setLineWidth(0.5);
  pdf.line(sumX + 3, sy, sumX + sumW - 3, sy); sy += 3;
  sumLine('Grand Total', R + ' ' + fmt(grandTotal), { bold: true, big: true, color: navy, gap: 7 });

  // Amount in words
  y = sy + 4;
  ensureSpace(20);
  const wordsText = numToWords(grandTotal);
  pdf.setFillColor(246, 248, 251); pdf.setDrawColor(200, 210, 230);
  const wordsW = CW * 0.60;
  const wordLines = pdf.splitTextToSize('In Words: ' + wordsText, wordsW - 8);
  const wordsH = wordLines.length * 4.5 + 8;
  pdf.roundedRect(ML, y, wordsW, wordsH, 2, 2, 'FD');
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...black);
  pdf.text(wordLines, ML + 4, y + 7);
  y += wordsH + 6;

  // ── Bank Details ──
  const bankItems = [
    ['Bank Name', quote.tenantBankName],
    ['Account Holder', quote.tenantBankAccountName || tn],
    ['Account Number', quote.tenantBankAccountNumber],
    ['IFSC Code', quote.tenantBankIfsc],
    ['GST No.', quote.tenantGstNumber],
  ].filter(([, v]) => v && v !== '-');

  if (bankItems.length > 0) {
    ensureSpace(28);
    const bCols = 3;
    const bRows = Math.ceil(bankItems.length / bCols);
    const bBoxH = bRows * 8 + 10;
    const bColW = CW / bCols;
    pdf.setFillColor(246, 248, 251); pdf.setDrawColor(221, 227, 236);
    pdf.roundedRect(ML, y, CW, bBoxH, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...navy);
    pdf.text('BANK DETAILS', ML + 4, y + 5);
    pdf.setDrawColor(200, 210, 225); pdf.setLineWidth(0.3);
    pdf.line(ML + 4, y + 6.5, ML + CW - 4, y + 6.5);
    bankItems.forEach(([label, value], idx) => {
      const col = idx % bCols, row = Math.floor(idx / bCols);
      const bx = ML + 4 + col * bColW, by = y + 11 + row * 8;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(...grey);
      pdf.text(label, bx, by);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(...black);
      pdf.text(str(value), bx, by + 4);
    });
    y += bBoxH + 6;
  }

  // ── Terms & Conditions ──
  ensureSpace(20);
  const validUntil = str(quote.validUntil);
  const addSection = (title, text) => {
    ensureSpace(18);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...navy);
    pdf.text(title.toUpperCase(), ML, y); y += 3;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(85, 85, 85);
    const lines = pdf.splitTextToSize(text, CW);
    pdf.text(lines, ML, y); y += lines.length * 2.8 + 2;
  };

  addSection('Terms & Conditions',
    '1. This quotation is valid until ' + validUntil + '. After this date, prices may change without notice.\n' +
    '2. Prices are subject to change without prior notice after the validity period.\n' +
    '3. Payment terms: 50% advance with order confirmation; balance before delivery.\n' +
    '4. Delivery timeline will be confirmed upon receipt of purchase order and advance payment.\n' +
    '5. Goods once dispatched will not be taken back unless there is a manufacturing defect.\n' +
    '6. All disputes are subject to local jurisdiction only.\n' +
    '7. Taxes as applicable at the time of invoicing will be charged.');

  addSection('Note',
    'Kindly review the specifications carefully before placing the order. For any clarifications, please contact us at ' +
    (quote.tenantPhone ? quote.tenantPhone : 'the number mentioned above') + '.');

  // ── Signature ──
  ensureSpace(25);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...black);
  pdf.text('For: ' + tn, W - MR - 3, y + 5, { align: 'right' });
  pdf.setDrawColor(150, 150, 150); pdf.setLineWidth(0.3);
  pdf.line(W - MR - 50, y + 20, W - MR - 3, y + 20);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8);
  pdf.text('Authorized Signatory', W - MR - 3, y + 25, { align: 'right' });
  y += 30;

  // ── Footer ──
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(221, 227, 236); pdf.setLineWidth(0.4);
    pdf.line(ML, H - 10, W - MR, H - 10);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(153, 153, 153);
    pdf.text('This is a computer-generated quotation. | ' + tn, W / 2, H - 6, { align: 'center' });
  }

  if (action === 'view') {
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');
  } else {
    pdf.save((quote.quoteNumber || 'quotation') + '.pdf');
  }
}

