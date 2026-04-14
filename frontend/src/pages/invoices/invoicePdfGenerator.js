import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const R = 'Rs.';

function fmt(v) { return Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function str(v) { if (v == null) return '-'; return String(v) || '-'; }

// ── Number to Words (Indian system) ──
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

// action: 'download' (default) | 'view' (open in new tab)
export default async function generateInvoicePdf(invoice, action = 'download') {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const ML = 14, MR = 14;
  const CW = W - ML - MR;
  let y = 14;

  const tn = str(invoice.tenantName);
  const tp = str(invoice.tenantPhone);

  // ── Colours (lightened) ──
  const navy   = [60, 110, 175];
  const brown  = [175, 95, 35];
  const grey   = [130, 130, 130];
  const white  = [255, 255, 255];
  const black  = [34, 34, 34];
  const orange = [210, 130, 30];
  const green  = [45, 150, 80];
  const red    = [205, 75, 75];

  const ensureSpace = (needed) => { if (y + needed > H - 14) { pdf.addPage(); y = 14; } };

  // ── Load logo ──
  const logoData = await loadImageAsDataUrl(invoice.tenantLogoUrl || '/aaprintntags_logo.png');

  // ══════════════════════════════════════════════════════════
  // "Bill" — document title (centered, above header box)
  // ══════════════════════════════════════════════════════════
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11); pdf.setTextColor(...black);
  pdf.text('Bill', W / 2, y, { align: 'center' }); y += 5;

  // ══════════════════════════════════════════════════════════
  // HEADER BOX — outer border, logo left, company info right-aligned
  // ══════════════════════════════════════════════════════════
  const headerH = 28;
  pdf.setDrawColor(160, 160, 160); pdf.setLineWidth(0.4);
  pdf.rect(ML, y, CW, headerH);

  // Logo – left side, vertically centred
  const logoW = 20, logoH = 20;
  if (logoData) {
    try { pdf.addImage(logoData, 'PNG', ML + 4, y + (headerH - logoH) / 2, logoW, logoH); } catch { /* skip */ }
  }

  // FSC badge (top-left corner of box, if applicable)
  if (invoice.fscInvoice) {
    pdf.setFillColor(...green);
    const fscLabel = 'FSC CERTIFIED';
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6);
    const fscBW = pdf.getTextWidth(fscLabel) + 5;
    pdf.roundedRect(ML + 4, y + 1, fscBW, 4.5, 1, 1, 'F');
    pdf.setTextColor(...white);
    pdf.text(fscLabel, ML + 6.5, y + 4.5);
  }

  // Company name – right-aligned, large bold
  let hy = y + 7;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(...black);
  pdf.text(tn, W - MR - 3, hy, { align: 'right' }); hy += 5;

  // Address (production unit address)
  if (invoice.productionUnitAddress) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...black);
    const al = pdf.splitTextToSize(str(invoice.productionUnitAddress), CW - 32).slice(0, 2);
    al.forEach(line => { pdf.text(line, W - MR - 3, hy, { align: 'right' }); hy += 3.5; });
  }

  // Phone / Email on one line
  const peArr = [
    invoice.tenantPhone ? 'Phone no.: ' + str(invoice.tenantPhone) : null,
    invoice.tenantEmail ? 'Email: ' + str(invoice.tenantEmail) : null,
  ].filter(Boolean);
  if (peArr.length) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...black);
    pdf.text(peArr.join('   '), W - MR - 3, hy, { align: 'right' }); hy += 4;
  }

  // GSTIN / State
  if (invoice.tenantGstNumber) {
    let gstLine = 'GSTIN: ' + str(invoice.tenantGstNumber);
    if (invoice.tenantState) gstLine += ', State: ' + str(invoice.tenantState);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...black);
    pdf.text(gstLine, W - MR - 3, hy, { align: 'right' }); hy += 4;
  }
  if (invoice.fscInvoice && invoice.tenantFscNumber) {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(...green);
    pdf.text('FSC Lic: ' + str(invoice.tenantFscNumber), W - MR - 3, hy, { align: 'right' });
  }

  y += headerH;

  // ══════════════════════════════════════════════════════════
  // THREE-COLUMN STRIP
  //   Col 1  "Bill From"              — customer details
  //   Col 2  "Transportation Details" — delivery info
  //   Col 3  "Bill Details"           — invoice meta, values right-aligned
  // ══════════════════════════════════════════════════════════
  const col1W  = Math.floor(CW * 0.37);
  const col2W  = Math.floor(CW * 0.27);
  const col3W  = CW - col1W - col2W;
  const col2X  = ML + col1W;
  const col3X  = col2X + col2W;
  const colHdrH     = 6;
  const infoTotalH  = colHdrH + 30;

  // Outer border + vertical dividers
  pdf.setDrawColor(160, 160, 160); pdf.setLineWidth(0.4);
  pdf.rect(ML, y, CW, infoTotalH);
  pdf.line(col2X, y, col2X, y + infoTotalH);
  pdf.line(col3X, y, col3X, y + infoTotalH);

  // Brown column headers
  [
    { x: ML,    w: col1W, label: 'Bill To' },
    { x: col2X, w: col2W, label: 'Transportation Details' },
    { x: col3X, w: col3W, label: 'Bill Details' },
  ].forEach(({ x, w, label }) => {
    pdf.setFillColor(...brown); pdf.rect(x, y, w, colHdrH, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(...white);
    pdf.text(label, x + 3, y + 4.5);
  });

  // Col 1 — Bill From
  let c1y = y + colHdrH + 5;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...black);
  pdf.text(str(invoice.customerName), ML + 3, c1y); c1y += 4.5;
  if (invoice.billToAddress) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...black);
    pdf.splitTextToSize(str(invoice.billToAddress), col1W - 6).slice(0, 2)
      .forEach(ln => { pdf.text(ln, ML + 3, c1y); c1y += 3.5; });
  }
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...black);
  if (invoice.customerContact) { pdf.text('Contact No. : ' + str(invoice.customerContact), ML + 3, c1y); c1y += 3.5; }
  if (invoice.customerGstin)   { pdf.text('GSTIN : '       + str(invoice.customerGstin),   ML + 3, c1y); c1y += 3.5; }
  if (invoice.customerState)   { pdf.text('State: '        + str(invoice.customerState),   ML + 3, c1y); }

  // Col 2 — Transportation Details
  let c2y = y + colHdrH + 5;
  const transRow = (label, value) => {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...black);
    pdf.text(label + ':', col2X + 3, c2y); c2y += 4;
    if (value && value !== '-') {
      pdf.splitTextToSize(str(value), col2W - 6).slice(0, 2)
        .forEach(ln => { pdf.text(ln, col2X + 3, c2y); c2y += 3.5; });
    }
    c2y += 1;
  };
  transRow('Delivery Date',     invoice.deliveryDate);
  transRow('Delivery Location', invoice.deliveryLocation || invoice.shipToAddress);

  // Col 3 — Bill Details (label grey, value right-aligned)
  let c3y = y + colHdrH + 5;
  const billDetailRow = (label, value) => {
    if (!value || value === '-') return;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...grey);
    pdf.text(label, col3X + 3, c3y);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(...black);
    pdf.text(str(value), W - MR - 3, c3y, { align: 'right' });
    c3y += 4.8;
  };
  billDetailRow('Bill No. :',       invoice.invoiceNumber);
  billDetailRow('Date :',           invoice.invoiceDate);
  if (invoice.placeOfSupply) billDetailRow('Place of supply:', invoice.placeOfSupply);
  billDetailRow('PO Date :',        invoice.poDate || invoice.invoiceDate);
  billDetailRow('PO Number :',      invoice.poNumber);

  y += infoTotalH + 2;

  // ══════════════════════════════════════════════════════════
  // LINE ITEMS TABLE
  //   # | Item name | HSN/SAC | Qty | Unit | Price/Unit |
  //   Taxable amount | CGST | SGST [| IGST] | Amount
  //   Last row = navy TOTAL row
  // ══════════════════════════════════════════════════════════
  const items = (invoice.invoiceProductDTOList || []).map((item, idx) => {
    const lineBase = (item.quantity || 0) * (item.price || 0);
    const cgst = item.cgst || 0, sgst = item.sgst || 0, igst = item.igst || 0;
    return {
      ...item, sn: idx + 1, lineBase,
      cgstAmt: lineBase * cgst / 100,
      sgstAmt: lineBase * sgst / 100,
      igstAmt: lineBase * igst / 100,
    };
  });

  const hasCgstSgst = items.some(i => (i.cgst || 0) > 0 || (i.sgst || 0) > 0);
  const hasIgst     = items.some(i => (i.igst || 0) > 0);

  const subTotal         = items.reduce((s, i) => s + i.lineBase, 0);
  const dc               = invoice.deliveryCharges || 0;
  const dcCgstRate = invoice.cgst || 0, dcSgstRate = invoice.sgst || 0, dcIgstRate = invoice.igst || 0;
  const dcCgstAmt  = dc * dcCgstRate / 100;
  const dcSgstAmt  = dc * dcSgstRate / 100;
  const dcIgstAmt  = dc * dcIgstRate / 100;
  const totalCgst  = items.reduce((s, i) => s + i.cgstAmt, 0) + dcCgstAmt;
  const totalSgst  = items.reduce((s, i) => s + i.sgstAmt, 0) + dcSgstAmt;
  const totalIgst  = items.reduce((s, i) => s + i.igstAmt, 0) + dcIgstAmt;
  const totalBeforeRound = subTotal + dc + totalCgst + totalSgst + totalIgst;
  const isRoundOff = !!invoice.roundOff;
  const roundOffAmt = isRoundOff ? (invoice.roundOffAmount || (Math.round(totalBeforeRound) - totalBeforeRound)) : 0;
  const grand = isRoundOff ? Math.round(totalBeforeRound) : totalBeforeRound;

  const totalQty       = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const totalCgstItems = items.reduce((s, i) => s + i.cgstAmt, 0);
  const totalSgstItems = items.reduce((s, i) => s + i.sgstAmt, 0);
  const totalIgstItems = items.reduce((s, i) => s + i.igstAmt, 0);
  const totalLineAmt   = items.reduce((s, i) => s + i.lineBase + i.cgstAmt + i.sgstAmt + i.igstAmt, 0);

  const productCell = (it) => ({
    content: str(it.productName) + (it.size && it.size !== '-' ? '\n' + str(it.size) : ''),
    styles: { fontStyle: 'bold' },
  });
  const gstCell = (amt, rate, color) => ({
    content: rate > 0 ? fmt(amt) + '\n(' + rate + '%)' : '-',
    styles: { halign: 'right', textColor: rate > 0 ? color : grey },
  });
  const totStyle = { fontStyle: 'bold', textColor: white, fillColor: navy };

  if (hasCgstSgst) {
    const showIgst = hasIgst;
    const head = showIgst
      ? [['#', 'Item name', 'HSN/\nSAC', 'Quantity', 'Unit', 'Price/\nUnit', 'Taxable\namount', 'CGST', 'SGST', 'IGST', 'Amount']]
      : [['#', 'Item name', 'HSN/\nSAC', 'Quantity', 'Unit', 'Price/\nUnit', 'Taxable\namount', 'CGST', 'SGST', 'Amount']];

    const body = items.map(it => [
      { content: String(it.sn), styles: { halign: 'center', textColor: grey } },
      productCell(it),
      { content: str(it.hsnCode), styles: { halign: 'center' } },
      { content: String(it.quantity || 0), styles: { halign: 'right' } },
      { content: str(it.unit || 'NOS'), styles: { halign: 'center' } },
      { content: R + ' ' + fmt(it.price), styles: { halign: 'right' } },
      { content: R + ' ' + fmt(it.lineBase), styles: { halign: 'right' } },
      gstCell(it.cgstAmt, it.cgst || 0, navy),
      gstCell(it.sgstAmt, it.sgst || 0, navy),
      ...(showIgst ? [gstCell(it.igstAmt, it.igst || 0, navy)] : []),
      { content: R + ' ' + fmt(it.lineBase + it.cgstAmt + it.sgstAmt + it.igstAmt), styles: { halign: 'right', fontStyle: 'bold' } },
    ]);
    body.push([
      { content: 'Total', colSpan: 3, styles: { ...totStyle, halign: 'right' } },
      { content: String(totalQty),              styles: { ...totStyle, halign: 'right' } },
      { content: '',                            styles: { fillColor: navy } },
      { content: '',                            styles: { fillColor: navy } },
      { content: R + ' ' + fmt(subTotal),       styles: { ...totStyle, halign: 'right' } },
      { content: R + ' ' + fmt(totalCgstItems), styles: { ...totStyle, halign: 'right' } },
      { content: R + ' ' + fmt(totalSgstItems), styles: { ...totStyle, halign: 'right' } },
      ...(showIgst ? [{ content: R + ' ' + fmt(totalIgstItems), styles: { ...totStyle, halign: 'right' } }] : []),
      { content: R + ' ' + fmt(totalLineAmt),   styles: { ...totStyle, halign: 'right' } },
    ]);

    autoTable(pdf, {
      startY: y, margin: { left: ML, right: MR }, head, body, theme: 'grid',
      headStyles: { fillColor: brown, textColor: white, fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
      columnStyles: showIgst ? {
        0: { cellWidth: 6, halign: 'center' }, 1: { cellWidth: 'auto' },
        2: { cellWidth: 11, halign: 'center' }, 3: { cellWidth: 10, halign: 'right' },
        4: { cellWidth: 9, halign: 'center' },  5: { cellWidth: 15, halign: 'right' },
        6: { cellWidth: 17, halign: 'right' },  7: { cellWidth: 17, halign: 'right' },
        8: { cellWidth: 17, halign: 'right' },  9: { cellWidth: 17, halign: 'right' },
        10: { cellWidth: 18, halign: 'right' },
      } : {
        0: { cellWidth: 6, halign: 'center' }, 1: { cellWidth: 'auto' },
        2: { cellWidth: 12, halign: 'center' }, 3: { cellWidth: 11, halign: 'right' },
        4: { cellWidth: 10, halign: 'center' }, 5: { cellWidth: 16, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' },  7: { cellWidth: 19, halign: 'right' },
        8: { cellWidth: 19, halign: 'right' },  9: { cellWidth: 21, halign: 'right' },
      },
      styles: { fontSize: 7.5, cellPadding: 2.2, textColor: [34, 34, 34], lineColor: [200, 200, 200], lineWidth: 0.2 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

  } else {
    const body = items.map(it => [
      { content: String(it.sn), styles: { halign: 'center', textColor: grey } },
      productCell(it),
      { content: str(it.hsnCode), styles: { halign: 'center' } },
      { content: String(it.quantity || 0), styles: { halign: 'right' } },
      { content: str(it.unit || 'NOS'), styles: { halign: 'center' } },
      { content: R + ' ' + fmt(it.price), styles: { halign: 'right' } },
      { content: R + ' ' + fmt(it.lineBase), styles: { halign: 'right' } },
      gstCell(it.igstAmt, it.igst || 0, navy),
      { content: R + ' ' + fmt(it.lineBase + it.igstAmt), styles: { halign: 'right', fontStyle: 'bold' } },
    ]);
    body.push([
      { content: 'Total', colSpan: 3, styles: { ...totStyle, halign: 'right' } },
      { content: String(totalQty),              styles: { ...totStyle, halign: 'right' } },
      { content: '',                            styles: { fillColor: navy } },
      { content: '',                            styles: { fillColor: navy } },
      { content: R + ' ' + fmt(subTotal),       styles: { ...totStyle, halign: 'right' } },
      { content: R + ' ' + fmt(totalIgstItems), styles: { ...totStyle, halign: 'right' } },
      { content: R + ' ' + fmt(totalLineAmt),   styles: { ...totStyle, halign: 'right' } },
    ]);
    autoTable(pdf, {
      startY: y, margin: { left: ML, right: MR },
      head: [['#', 'Item name', 'HSN/\nSAC', 'Quantity', 'Unit', 'Price/\nUnit', 'Taxable\namount', 'IGST', 'Amount']],
      body, theme: 'grid',
      headStyles: { fillColor: brown, textColor: white, fontStyle: 'bold', fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' }, 1: { cellWidth: 'auto' },
        2: { cellWidth: 13, halign: 'center' }, 3: { cellWidth: 13, halign: 'right' },
        4: { cellWidth: 12, halign: 'center' }, 5: { cellWidth: 19, halign: 'right' },
        6: { cellWidth: 21, halign: 'right' },  7: { cellWidth: 21, halign: 'right' },
        8: { cellWidth: 23, halign: 'right' },
      },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [34, 34, 34], lineColor: [200, 200, 200], lineWidth: 0.2 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
  }

  y = pdf.lastAutoTable.finalY + 4;

  // ══════════════════════════════════════════════════════════
  // TAX SUMMARY TABLE (left)  +  AMOUNTS (right, brown header)
  // ══════════════════════════════════════════════════════════
  ensureSpace(55);

  const gstGroups  = new Map();
  const igstGroups = new Map();
  items.forEach(item => {
    const csr = (item.cgst || 0) + (item.sgst || 0);
    if (csr > 0) gstGroups.set(csr, (gstGroups.get(csr) || 0) + item.lineBase);
    if ((item.igst || 0) > 0) igstGroups.set(item.igst, (igstGroups.get(item.igst) || 0) + item.lineBase);
  });

  const taxRows = [];
  [...gstGroups.entries()].sort((a, b) => a[0] - b[0]).forEach(([rate, base]) => {
    const hr = rate / 2, ta = base * hr / 100;
    taxRows.push([
      { content: 'SGST', styles: { fontStyle: 'bold' } },
      { content: R + ' ' + fmt(base), styles: { halign: 'right' } },
      { content: hr + '%', styles: { halign: 'center' } },
      { content: R + ' ' + fmt(ta), styles: { halign: 'right', textColor: orange } },
    ]);
    taxRows.push([
      { content: 'CGST', styles: { fontStyle: 'bold' } },
      { content: R + ' ' + fmt(base), styles: { halign: 'right' } },
      { content: hr + '%', styles: { halign: 'center' } },
      { content: R + ' ' + fmt(ta), styles: { halign: 'right', textColor: orange } },
    ]);
  });
  [...igstGroups.entries()].sort((a, b) => a[0] - b[0]).forEach(([rate, base]) => {
    const ta = base * rate / 100;
    taxRows.push([
      { content: 'IGST', styles: { fontStyle: 'bold' } },
      { content: R + ' ' + fmt(base), styles: { halign: 'right' } },
      { content: rate + '%', styles: { halign: 'center' } },
      { content: R + ' ' + fmt(ta), styles: { halign: 'right', textColor: orange } },
    ]);
  });
  if (dc > 0 && (dcCgstRate > 0 || dcSgstRate > 0)) {
    taxRows.push([
      { content: 'SGST (DC)', styles: { fontStyle: 'bold', textColor: grey } },
      { content: R + ' ' + fmt(dc), styles: { halign: 'right' } },
      { content: dcSgstRate + '%', styles: { halign: 'center' } },
      { content: R + ' ' + fmt(dcSgstAmt), styles: { halign: 'right', textColor: orange } },
    ]);
    taxRows.push([
      { content: 'CGST (DC)', styles: { fontStyle: 'bold', textColor: grey } },
      { content: R + ' ' + fmt(dc), styles: { halign: 'right' } },
      { content: dcCgstRate + '%', styles: { halign: 'center' } },
      { content: R + ' ' + fmt(dcCgstAmt), styles: { halign: 'right', textColor: orange } },
    ]);
  }
  if (dc > 0 && dcIgstRate > 0) {
    taxRows.push([
      { content: 'IGST (DC)', styles: { fontStyle: 'bold', textColor: grey } },
      { content: R + ' ' + fmt(dc), styles: { halign: 'right' } },
      { content: dcIgstRate + '%', styles: { halign: 'center' } },
      { content: R + ' ' + fmt(dcIgstAmt), styles: { halign: 'right', textColor: orange } },
    ]);
  }

  const taxTableW = CW * 0.50;
  const amtX      = ML + taxTableW + 6;
  const amtW      = CW - taxTableW - 6;
  const taxStartY = y;

  if (taxRows.length > 0) {
    autoTable(pdf, {
      startY: taxStartY,
      margin: { left: ML, right: W - ML - taxTableW },
      head: [['Tax type', 'Taxable amount', 'Rate', 'Tax amount']],
      body: taxRows, theme: 'grid',
      headStyles: { fillColor: brown, textColor: white, fontStyle: 'bold', fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 'auto', halign: 'right' },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 24, halign: 'right' },
      },
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [34, 34, 34], lineColor: [200, 200, 200], lineWidth: 0.2 },
      alternateRowStyles: { fillColor: [252, 248, 244] },
    });
  }

  // Amounts — right column
  const paidAmt = Number(invoice.paidAmount || 0);
  const balance = grand - paidAmt;
  let sy = taxStartY;

  // "Amounts" brown header label
  pdf.setFillColor(...brown); pdf.rect(amtX, sy, amtW, 6, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...white);
  pdf.text('Amounts', amtX + 3, sy + 4.5); sy += 9;

  const sumLine = (label, value, opts = {}) => {
    pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    pdf.setFontSize(opts.big ? 10 : 8.5);
    pdf.setTextColor(...(opts.color || black));
    pdf.text(label, amtX + 3, sy);
    pdf.text(value, amtX + amtW - 3, sy, { align: 'right' });
    sy += opts.gap || 5;
  };

  sumLine('Sub Total', R + ' ' + fmt(subTotal));
  if (dc > 0) sumLine('Delivery Charges', R + ' ' + fmt(dc));
  if (totalCgst > 0.001) sumLine('CGST', R + ' ' + fmt(totalCgst), { color: grey });
  if (totalSgst > 0.001) sumLine('SGST', R + ' ' + fmt(totalSgst), { color: grey });
  if (totalIgst > 0.001) sumLine('IGST', R + ' ' + fmt(totalIgst), { color: grey });
  if (isRoundOff) {
    sumLine('Round off', (roundOffAmt >= 0 ? '' : '-') + fmt(Math.abs(roundOffAmt)), { color: grey });
  }

  pdf.setDrawColor(...black); pdf.setLineWidth(0.5);
  pdf.line(amtX + 3, sy, amtX + amtW - 3, sy); sy += 3;
  sumLine('Total', R + ' ' + fmt(grand), { bold: true, big: true, color: black, gap: 7 });

  pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3);
  pdf.line(amtX + 3, sy, amtX + amtW - 3, sy); sy += 3;
  sumLine('Paid',    R + ' ' + fmt(paidAmt), { color: green, bold: paidAmt > 0, gap: 4.5 });
  sumLine('Balance', R + ' ' + fmt(balance), { bold: true, color: balance > 0.005 ? red : green });

  y = Math.max(taxRows.length > 0 ? pdf.lastAutoTable.finalY : taxStartY, sy) + 4;

  // ══════════════════════════════════════════════════════════
  // "Bill Amount In Words" (left half, brown header)
  //  +  Signature right-side only ("For: company" + "Authorized Signatory")
  // ══════════════════════════════════════════════════════════
  ensureSpace(30);

  const wordsW      = taxTableW;
  const sigColX     = ML + wordsW + 6;
  const sigColW     = CW - wordsW - 6;
  const wordsStartY = y;

  // Brown "Bill Amount In Words" header
  pdf.setFillColor(...brown); pdf.rect(ML, wordsStartY, wordsW, 6, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...white);
  pdf.text('Bill Amount In Words', ML + 3, wordsStartY + 4.5);

  // Words text
  const wordsText  = numToWords(grand);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...black);
  const wordsLines = pdf.splitTextToSize(wordsText, wordsW - 6);
  pdf.text(wordsLines, ML + 3, wordsStartY + 11);
  const wordsSectionH = 6 + 5 + wordsLines.length * 4.5;

  // Border around words section
  pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3);
  pdf.rect(ML, wordsStartY, wordsW, wordsSectionH);

  // Signature — right column
  let sigY = wordsStartY + 5;
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...black);
  pdf.text('For : ' + tn, sigColX + sigColW, sigY, { align: 'right' });
  sigY += 20;

  pdf.setDrawColor(150, 150, 150); pdf.setLineWidth(0.3);
  pdf.line(sigColX + 4, sigY, sigColX + sigColW, sigY); sigY += 4;

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...black);
  pdf.text('Authorized Signatory', sigColX + sigColW, sigY, { align: 'right' });

  y = Math.max(wordsStartY + wordsSectionH, sigY + 6) + 6;

  // ══════════════════════════════════════════════════════════
  // BANK DETAILS
  // ══════════════════════════════════════════════════════════
  ensureSpace(28);
  const bankItems = [
    ['Bank Name',      invoice.tenantBankName],
    ['Account Holder', invoice.tenantBankAccountName || tn],
    ['Account Number', invoice.tenantBankAccountNumber],
    ['IFSC Code',      invoice.tenantBankIfsc],
    ['GST No.',        invoice.tenantGstNumber],
  ].filter(([, v]) => v && v !== '-');

  if (bankItems.length > 0) {
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
    y += bBoxH + 5;
  }

  // ══════════════════════════════════════════════════════════
  // REMARKS
  // ══════════════════════════════════════════════════════════
  if (invoice.remarks) {
    ensureSpace(14);
    pdf.setFillColor(255, 251, 240); pdf.setDrawColor(255, 231, 186);
    pdf.roundedRect(ML, y, CW, 9, 1, 1, 'FD');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(212, 136, 6);
    pdf.text('Remarks: ', ML + 3, y + 6);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(68, 68, 68);
    pdf.text(str(invoice.remarks), ML + 22, y + 6);
    y += 13;
  }

  // ══════════════════════════════════════════════════════════
  // TERMS  (retained)
  // ══════════════════════════════════════════════════════════
  const addSection = (title, text) => {
    ensureSpace(18);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...navy);
    pdf.text(title.toUpperCase(), ML, y); y += 3;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(85, 85, 85);
    const lines = pdf.splitTextToSize(text, CW);
    pdf.text(lines, ML, y); y += lines.length * 2.8 + 2;
  };

  addSection('Condition',
    'Since human errors and unprecedented power and calamitic conditions can create flaw which might skip our attention at times. Doubly check the status of the products before use and ensure that this is an accord which your requirement once our product have been used by you will no longer acknowledge responsibility your subsequently find them to be incorrect for our production. Therefore please co-operate with us in assuring that our products are correct you use them.');

  addSection('Notice',
    'Our products are sensitive to abrasion and heat. Do test this product under actual production condition, such as washing, dyeing and/or ironing to ensure that washing process, chemical and/or temperature do not cause the products distortion, and/or bleeding on/to garments. ' + tn + ' does not guarantee the products for special garment treatment or press temperature above 110 C. For further information please contact our customer service cell at Phone no: +91 ' + tp);

  addSection('Terms and Conditions',
    'Goods once sold will not be taken back or replaced. If payment not made within 30 days, interest @ 24% per annum will be charged extra. All disputes are subject to Tirupur jurisdiction. Our responsibility is limited to our products only. All payments should be made by account payee cheque or draft only.\nYour payments should be in favour of ' + (invoice.tenantBankAccountName || tn));

  ensureSpace(6);
  pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7); pdf.setTextColor(119, 119, 119);
  pdf.text('*Please check the Delivery Challan', ML, y); y += 6;

  // ══════════════════════════════════════════════════════════
  // FOOTER — every page
  // ══════════════════════════════════════════════════════════
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(221, 227, 236); pdf.setLineWidth(0.4);
    pdf.line(ML, H - 10, W - MR, H - 10);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(153, 153, 153);
    pdf.text('This is a computer-generated invoice and does not require a physical signature.', W / 2, H - 6, { align: 'center' });
  }

  if (action === 'view') {
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');
  } else {
    pdf.save((invoice.invoiceNumber || 'invoice') + '.pdf');
  }
}
