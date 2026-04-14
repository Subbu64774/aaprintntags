import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function str(v) {
  if (v == null) return '-';
  if (typeof v === 'string') return v || '-';
  if (Array.isArray(v)) return v.join('-'); // LocalDate arrays like [2026,2,19]
  return String(v);
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
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          resolve(c.toDataURL('image/png'));
        } catch { resolve(null); }
      };
      img.onerror = () => { clearTimeout(timer); resolve(null); };
      img.src = src;
    } catch { clearTimeout(timer); resolve(null); }
  });
}

/**
 * Generate a Job Card PDF for a purchase order.
 * Layout inspired by the AA PRINT N TAGS job card style.
 */
export default async function generateJobCardPdf(order, products) {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();   // 210
  const H = pdf.internal.pageSize.getHeight();  // 297
  const ML = 14, MR = 14;
  const CW = W - ML - MR;
  let y = 12;

  const navy = [26, 58, 107];
  const grey = [102, 102, 102];
  const black = [34, 34, 34];
  const white = [255, 255, 255];
  const lightBg = [246, 248, 251];
  const orange = [230, 126, 34];

  // Build product lookup
  const prodMap = {};
  (products || []).forEach((p) => { prodMap[p.productId] = p; });

  // Load logo
  const logoUrl = order.tenantLogoUrl || '/aaprintntags_logo.png';
  const logoData = await loadImageAsDataUrl(logoUrl);

  const tenantName = str(order.tenantName);

  // ══════════════════════════════════════
  //  JOB CARD BADGE
  // ══════════════════════════════════════
  const badgeW = 50, badgeH = 9;
  const badgeX = (W - badgeW) / 2;
  pdf.setFillColor(...orange);
  pdf.roundedRect(badgeX, y, badgeW, badgeH, 3, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(...white);
  pdf.text('Job Card', W / 2, y + 6.5, { align: 'center' });
  y += badgeH + 6;

  // ══════════════════════════════════════
  //  LOGO + TENANT NAME
  // ══════════════════════════════════════
  const logoW = 20, logoH = 10;
  const totalLogoTextW = logoData ? logoW + 5 : 0;

  // Estimate text width to center logo+text together
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  const textW = pdf.getTextWidth(tenantName);
  const blockW = totalLogoTextW + textW;
  const blockX = (W - blockW) / 2;

  if (logoData) {
    try { pdf.addImage(logoData, 'PNG', blockX, y - 2, logoW, logoH); } catch { /* skip */ }
  }

  pdf.setTextColor(...navy);
  pdf.text(tenantName, blockX + totalLogoTextW, y + 5);
  y += logoH + 6;

  // Thin line
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(ML, y, W - MR, y);
  y += 5;

  // ══════════════════════════════════════
  //  ORDER INFO - 2 columns
  // ══════════════════════════════════════
  const colW = CW / 2;
  const infoLabel = (text, x, yy) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...grey);
    pdf.text(text, x, yy);
  };
  const infoVal = (text, x, yy) => {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...black);
    pdf.text(str(text), x, yy);
  };

  // Row 1
  infoLabel('Customer Name :', ML, y);
  infoVal(order.customerName, ML + 30, y);

  infoLabel('Date :', ML + colW, y);
  infoVal(order.poDate, ML + colW + 14, y);
  y += 5;

  // Row 2
  if (order.productionUnitName) {
    infoLabel('Production Unit :', ML, y);
    infoVal(order.productionUnitName, ML + 30, y);
  }

  infoLabel('PO Number :', ML + colW, y);
  infoVal(order.poNumber, ML + colW + 24, y);
  y += 7;

  // ══════════════════════════════════════
  //  ITEMS TABLE
  // ══════════════════════════════════════
  const items = (order.orderProductDTOList || []).map((item, idx) => {
    const prod = prodMap[item.productId] || {};
    return {
      ...item,
      sn: idx + 1,
      productName: item.productName || prod.productName || 'Product #' + item.productId,
      additionalWorks: item.additionalWorks || prod.additionalWorks || '',
    };
  });

  autoTable(pdf, {
    startY: y,
    margin: { left: ML, right: MR },
    head: [['S.NO', 'ITEM NAME', 'SIZE', 'DESCRIPTION', 'TOTAL QUANTITY']],
    body: items.map((it) => [
      String(it.sn),
      str(it.productName),
      str(it.size),
      str(it.description),
      String(it.quantity || 0),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: black, fontStyle: 'bold', fontSize: 8, cellPadding: 2.5 },
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [51, 51, 51], lineColor: [180, 180, 180], lineWidth: 0.3 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 28 },
      3: { cellWidth: 38 },
      4: { cellWidth: 30, halign: 'center' },
    },
  });
  y = pdf.lastAutoTable.finalY + 8;

  // ══════════════════════════════════════
  //  PER-ITEM: WORK DONE + ADDITIONAL WORK
  // ══════════════════════════════════════
  items.forEach((item) => {
    // Check page space
    if (y + 50 > H - 20) { pdf.addPage(); y = 14; }

    // Item header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...navy);
    pdf.text('Item ' + item.sn + ': ' + str(item.productName), ML, y);
    y += 5;

    // Work Done table
    autoTable(pdf, {
      startY: y,
      margin: { left: ML, right: MR },
      head: [['Work Done']],
      body: [],
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: black, fontStyle: 'bold', fontSize: 8, cellPadding: 2 },
      styles: { fontSize: 8, cellPadding: 2, lineColor: [180, 180, 180], lineWidth: 0.3 },
    });
    y = pdf.lastAutoTable.finalY;

    autoTable(pdf, {
      startY: y,
      margin: { left: ML, right: MR },
      head: [['Board/Roll Name', 'G.S.M', 'Board/Roll Size', 'Plate Date', 'No of Board/Roll', 'Extra Board/Roll']],
      body: [['', '', '', '', '', '']], // empty row for manual fill
      theme: 'grid',
      headStyles: { fillColor: white, textColor: [80, 80, 80], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
      styles: { fontSize: 8, cellPadding: 3, lineColor: [180, 180, 180], lineWidth: 0.3, minCellHeight: 8 },
    });
    y = pdf.lastAutoTable.finalY + 4;

    // Additional Work table
    const awText = item.additionalWorks || '';
    const awItems = awText.split(',').map((s) => s.trim()).filter(Boolean);

    autoTable(pdf, {
      startY: y,
      margin: { left: ML, right: MR },
      head: [['Additional Work']],
      body: [],
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: black, fontStyle: 'bold', fontSize: 8, cellPadding: 2 },
      styles: { fontSize: 8, cellPadding: 2, lineColor: [180, 180, 180], lineWidth: 0.3 },
    });
    y = pdf.lastAutoTable.finalY;

    if (awItems.length > 0) {
      // Arrange in rows of 6
      const rows = [];
      for (let i = 0; i < awItems.length; i += 6) {
        const row = awItems.slice(i, i + 6);
        while (row.length < 6) row.push('');
        rows.push(row);
      }
      autoTable(pdf, {
        startY: y,
        margin: { left: ML, right: MR },
        body: rows,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [180, 180, 180], lineWidth: 0.3, halign: 'center' },
      });
      y = pdf.lastAutoTable.finalY + 4;
    } else {
      autoTable(pdf, {
        startY: y,
        margin: { left: ML, right: MR },
        head: [['Die Cut', 'Lamination', 'Emboss/Deboss', 'Pasting', 'UV', 'Cutting + Holes']],
        body: [['', '', '', '', '', '']],
        theme: 'grid',
        headStyles: { fillColor: white, textColor: [80, 80, 80], fontStyle: 'normal', fontSize: 7, cellPadding: 2 },
        styles: { fontSize: 8, cellPadding: 3, lineColor: [180, 180, 180], lineWidth: 0.3, minCellHeight: 8 },
      });
      y = pdf.lastAutoTable.finalY + 4;
    }

    // Packing List
    if (y + 30 > H - 20) { pdf.addPage(); y = 14; }

    autoTable(pdf, {
      startY: y,
      margin: { left: ML, right: MR },
      head: [['Packing List']],
      body: [],
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: black, fontStyle: 'bold', fontSize: 8, cellPadding: 2 },
      styles: { fontSize: 8, cellPadding: 2, lineColor: [180, 180, 180], lineWidth: 0.3 },
    });
    y = pdf.lastAutoTable.finalY;

    autoTable(pdf, {
      startY: y,
      margin: { left: ML, right: MR },
      head: [['Tag Weight', 'No of Qty', 'No of Package', 'Finished Qty', 'Balance Qty']],
      body: [['', '', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: white, textColor: [80, 80, 80], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
      styles: { fontSize: 8, cellPadding: 3, lineColor: [180, 180, 180], lineWidth: 0.3, minCellHeight: 8 },
    });
    y = pdf.lastAutoTable.finalY + 4;

    // Q.C table
    if (y + 20 > H - 20) { pdf.addPage(); y = 14; }

    autoTable(pdf, {
      startY: y,
      margin: { left: ML, right: MR },
      head: [['Q.C']],
      body: [],
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: black, fontStyle: 'bold', fontSize: 8, cellPadding: 2 },
      styles: { fontSize: 8, cellPadding: 2, lineColor: [180, 180, 180], lineWidth: 0.3 },
    });
    y = pdf.lastAutoTable.finalY;

    autoTable(pdf, {
      startY: y,
      margin: { left: ML, right: MR },
      head: [['Offset', 'Die Cut', 'Lamination UV', 'Checking', 'Packing']],
      body: [['', '', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: white, textColor: [80, 80, 80], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
      styles: { fontSize: 8, cellPadding: 3, lineColor: [180, 180, 180], lineWidth: 0.3, minCellHeight: 8 },
    });
    y = pdf.lastAutoTable.finalY + 8;
  });

  // ══════════════════════════════════════
  //  PRODUCT MANAGER SIGNATURE
  // ══════════════════════════════════════
  if (y + 20 > H - 15) { pdf.addPage(); y = 14; }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...black);
  pdf.text('Product Manager', W - MR, y + 12, { align: 'right' });

  // ══════════════════════════════════════
  //  PAGE NUMBER FOOTER
  // ══════════════════════════════════════
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Page ' + i + '/' + totalPages, W / 2, H - 8, { align: 'center' });
  }

  // Save
  pdf.save('JobCard_' + (order.poNumber || order.orderId) + '.pdf');
}

