import { forwardRef } from 'react';

const fmt = (v) => Number(v || 0).toFixed(2);

// Convert number to words (Indian numbering system)
function numberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanThousand(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  }

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);

  let result = '';
  let remaining = intPart;
  if (remaining >= 10000000) {
    result += convertLessThanThousand(Math.floor(remaining / 10000000)) + ' Crore ';
    remaining = remaining % 10000000;
  }
  if (remaining >= 100000) {
    result += convertLessThanThousand(Math.floor(remaining / 100000)) + ' Lakh ';
    remaining = remaining % 100000;
  }
  if (remaining >= 1000) {
    result += convertLessThanThousand(Math.floor(remaining / 1000)) + ' Thousand ';
    remaining = remaining % 1000;
  }
  result += convertLessThanThousand(remaining);

  let words = 'Rupees ' + result.trim();
  if (decPart > 0) words += ' and ' + convertLessThanThousand(decPart) + ' Paise';
  return words + ' Only';
}

/* ─────── GST Invoice Print Styles (matching reference format) ─────── */
const S = {
  page: {
    width: '210mm',
    minHeight: '297mm',
    padding: '8mm 10mm',
    fontFamily: "'Arial', 'Helvetica', sans-serif",
    fontSize: 10,
    color: '#000',
    background: '#fff',
    lineHeight: 1.4,
  },
  outerBorder: {
    border: '2px solid #000',
    padding: 0,
  },
  headerRow: {
    display: 'flex',
    borderBottom: '1px solid #000',
  },
  headerLeft: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 10px',
    borderRight: '1px solid #000',
  },
  headerCenter: {
    flex: 2,
    textAlign: 'center',
    padding: '6px 8px',
    borderRight: '1px solid #000',
  },
  headerRight: {
    flex: 1.5,
    padding: '6px 8px',
    fontSize: 9,
  },
  logo: { height: 50, width: 'auto', objectFit: 'contain' },
  companyName: { fontSize: 16, fontWeight: 'bold', margin: '2px 0' },
  companyAddr: { fontSize: 9, color: '#333', margin: '1px 0' },
  gstin: { fontSize: 9.5, fontWeight: 'bold', margin: '2px 0' },
  titleBar: {
    textAlign: 'center',
    borderBottom: '1px solid #000',
    padding: '4px 0',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: '2px',
  },
  metaRow: {
    display: 'flex',
    borderBottom: '1px solid #000',
    fontSize: 9.5,
  },
  metaCell: {
    flex: 1,
    padding: '3px 8px',
    borderRight: '1px solid #000',
  },
  metaCellLast: {
    flex: 1,
    padding: '3px 8px',
  },
  detailsRow: {
    display: 'flex',
    borderBottom: '1px solid #000',
  },
  detailsCol: {
    flex: 1,
    padding: '6px 8px',
    borderRight: '1px solid #000',
  },
  detailsColLast: {
    flex: 1,
    padding: '6px 8px',
  },
  detailsTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textDecoration: 'underline',
    marginBottom: 3,
  },
  detailsName: { fontSize: 10, fontWeight: 'bold', margin: '2px 0' },
  detailsText: { fontSize: 9, lineHeight: 1.4, margin: '1px 0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    border: '1px solid #000',
    padding: '4px 3px',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    background: 'none',
  },
  td: {
    border: '1px solid #000',
    padding: '4px 4px',
    fontSize: 9,
    textAlign: 'center',
  },
  tdL: {
    border: '1px solid #000',
    padding: '4px 4px',
    fontSize: 9,
    textAlign: 'left',
  },
  tdR: {
    border: '1px solid #000',
    padding: '4px 4px',
    fontSize: 9,
    textAlign: 'right',
  },
  summaryRow: {
    display: 'flex',
    borderBottom: '1px solid #000',
  },
  bankBox: {
    flex: 1.2,
    padding: '6px 8px',
    borderRight: '1px solid #000',
    fontSize: 9,
  },
  totalBox: {
    flex: 0.8,
    padding: '0',
    fontSize: 9.5,
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 8px',
    borderBottom: '1px solid #000',
  },
  grandTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 8px',
    fontWeight: 'bold',
    fontSize: 11,
  },
  footerRow: {
    display: 'flex',
    borderTop: '1px solid #000',
  },
  declaration: {
    flex: 1.2,
    padding: '6px 8px',
    borderRight: '1px solid #000',
    fontSize: 8.5,
    lineHeight: 1.5,
  },
  signatureBox: {
    flex: 0.8,
    padding: '6px 8px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 80,
  },
};

const InvoicePrintTemplate = forwardRef(({ invoice }, ref) => {
  if (!invoice) return null;

  const items = (invoice.invoiceProductDTOList || []).map((item, idx) => ({
    ...item,
    sn: idx + 1,
    lineTotal: (item.quantity || 0) * (item.price || 0),
  }));

  const subTotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const dc = invoice.deliveryCharges || 0;
  const taxable = subTotal + dc;

  const cgP = invoice.cgst || 0, sgP = invoice.sgst || 0, igP = invoice.igst || 0;
  const cgA = taxable * (cgP / 100), sgA = taxable * (sgP / 100), igA = taxable * (igP / 100);
  const totalTax = cgA + sgA + igA;
  const otherCharges = dc;
  const grand = taxable + totalTax;

  const tn = invoice.tenantName || '';
  const logoSrc = invoice.tenantLogoUrl || '/salesapp_logo.png';
  const tenantAddr = invoice.tenantRegisteredAddress || '';
  const tenantGst = invoice.tenantGstNumber || '';
  const tenantPhone = invoice.tenantPhone || '';
  const stateCode = tenantGst ? tenantGst.substring(0, 2) : '';
  const customerGst = invoice.customerGstNumber || '';

  return (
    <div ref={ref} style={S.page}>
      <div style={S.outerBorder}>

        {/* ═══════════════ INVOICE TITLE BAR ═══════════════ */}
        <div style={S.titleBar}>INVOICE</div>

        {/* ═══════════════ HEADER: Logo + Company + Contact ═══════════════ */}
        <div style={S.headerRow}>
          <div style={S.headerLeft}>
            <img src={logoSrc} alt="Logo" style={S.logo} />
          </div>
          <div style={S.headerCenter}>
            <div style={S.companyName}>{tn}</div>
            {invoice.productionUnitName && (
              <div style={S.companyAddr}>{invoice.productionUnitName}</div>
            )}
            {invoice.productionUnitAddress && (
              <div style={S.companyAddr}>{invoice.productionUnitAddress}</div>
            )}
            {tenantAddr && <div style={S.companyAddr}>{tenantAddr}</div>}
            {tenantGst && <div style={S.gstin}>GSTIN : {tenantGst}</div>}
          </div>
          <div style={S.headerRight}>
            {tenantPhone && <div><strong>Mobile:</strong> +91-{tenantPhone}</div>}
          </div>
        </div>

        {/* ═══════════════ INVOICE META (No, Date, PO) ═══════════════ */}
        <div style={S.metaRow}>
          <div style={S.metaCell}><strong>Invoice No :</strong> {invoice.invoiceNumber}</div>
          <div style={S.metaCell}><strong>Invoice Date :</strong> {invoice.invoiceDate || '-'}</div>
          <div style={S.metaCellLast}><strong>PO / Order No :</strong> {invoice.poNumber || '-'}</div>
        </div>

        {/* ═══════════════ GSTIN + STATE CODE ═══════════════ */}
        <div style={S.metaRow}>
          <div style={S.metaCell}><strong>GSTIN :</strong> {tenantGst}</div>
          <div style={S.metaCellLast}><strong>State code :</strong> {stateCode}</div>
        </div>

        {/* ═══════════════ BILL TO / SHIP TO ═══════════════ */}
        <div style={S.detailsRow}>
          <div style={S.detailsCol}>
            <div style={S.detailsTitle}>Details of Receiver (Billed to)</div>
            <div style={S.detailsName}>NAME : {invoice.customerName}</div>
            <div style={S.detailsText}><strong>Address :</strong> {invoice.billToAddress || '-'}</div>
            {invoice.customerPhone && (
              <div style={S.detailsText}><strong>Phone :</strong> {invoice.customerPhone}</div>
            )}
            {customerGst && (
              <div style={{ ...S.detailsText, marginTop: 4 }}>
                <strong>GSTIN/Unique ID :</strong> {customerGst}
              </div>
            )}
          </div>
          <div style={S.detailsColLast}>
            <div style={S.detailsTitle}>Details of Consignee (Shipped to)</div>
            <div style={S.detailsName}>NAME : {invoice.customerName}</div>
            <div style={S.detailsText}><strong>Address :</strong> {invoice.shipToAddress || invoice.billToAddress || '-'}</div>
            {invoice.customerPhone && (
              <div style={S.detailsText}><strong>Phone :</strong> {invoice.customerPhone}</div>
            )}
            {customerGst && (
              <div style={{ ...S.detailsText, marginTop: 4 }}>
                <strong>GSTIN/Unique ID :</strong> {customerGst}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════ LINE ITEMS TABLE ═══════════════ */}
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th} rowSpan={2}>S.no</th>
              <th style={S.th} rowSpan={2}>Description of Goods</th>
              <th style={{ ...S.th, minWidth: 50 }} rowSpan={2}>HSN/SAC<br />code</th>
              <th style={S.th} rowSpan={2}>QTY</th>
              <th style={S.th} rowSpan={2}>Rate<br />(per item)</th>
              <th style={S.th} rowSpan={2}>Total Value</th>
              <th style={S.th} rowSpan={2}>Total<br />Taxable<br />value</th>
              <th style={S.th} colSpan={2}>CGST</th>
              <th style={S.th} colSpan={2}>SGST</th>
              <th style={S.th} colSpan={2}>IGST</th>
            </tr>
            <tr>
              <th style={S.th}>Rate</th>
              <th style={S.th}>Amt</th>
              <th style={S.th}>Rate</th>
              <th style={S.th}>Amt</th>
              <th style={S.th}>Rate</th>
              <th style={S.th}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const lineCg = it.cgst != null ? it.cgst : cgP;
              const lineSg = it.sgst != null ? it.sgst : sgP;
              const lineIg = it.igst != null ? it.igst : igP;
              const lineTaxable = it.lineTotal;
              const lineCgAmt = lineTaxable * (lineCg / 100);
              const lineSgAmt = lineTaxable * (lineSg / 100);
              const lineIgAmt = lineTaxable * (lineIg / 100);
              return (
                <tr key={it.sn}>
                  <td style={S.td}>{it.sn}</td>
                  <td style={S.tdL}>{it.productName || it.description || '-'}{it.size ? ` (${it.size})` : ''}</td>
                  <td style={S.td}>{it.hsnCode || '-'}</td>
                  <td style={S.td}>{it.quantity}</td>
                  <td style={S.tdR}>{fmt(it.price)}</td>
                  <td style={S.tdR}>{fmt(it.lineTotal)}</td>
                  <td style={S.tdR}>{fmt(lineTaxable)}</td>
                  <td style={S.td}>{lineCg}%</td>
                  <td style={S.tdR}>{fmt(lineCgAmt)}</td>
                  <td style={S.td}>{lineSg}%</td>
                  <td style={S.tdR}>{fmt(lineSgAmt)}</td>
                  <td style={S.td}>{lineIg > 0 ? `${lineIg}%` : '0%'}</td>
                  <td style={S.tdR}>{lineIg > 0 ? fmt(lineIgAmt) : '-'}</td>
                </tr>
              );
            })}
            {/* Total Row */}
            <tr style={{ fontWeight: 'bold' }}>
              <td style={S.td} colSpan={4}>Total</td>
              <td style={S.tdR}></td>
              <td style={S.tdR}>{fmt(subTotal)}</td>
              <td style={S.tdR}>{fmt(taxable)}</td>
              <td style={S.td}></td>
              <td style={S.tdR}>{fmt(cgA)}</td>
              <td style={S.td}></td>
              <td style={S.tdR}>{fmt(sgA)}</td>
              <td style={S.td}></td>
              <td style={S.tdR}>{igA > 0 ? fmt(igA) : '-'}</td>
            </tr>
          </tbody>
        </table>

        {/* ═══════════════ BANK DETAILS + TOTALS ═══════════════ */}
        <div style={S.summaryRow}>
          <div style={S.bankBox}>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: 4 }}>Bank Details:</div>
            <div><strong>Account Name</strong> : {invoice.tenantBankAccountName || tn}</div>
            <div><strong>Account Number</strong> : {invoice.tenantBankAccountNumber || '-'}</div>
            <div><strong>Bank Name</strong> : {invoice.tenantBankName || '-'}</div>
            <div><strong>IFSC Code</strong> : {invoice.tenantBankIfsc || '-'}</div>

            <div style={{ marginTop: 8, borderTop: '1px solid #000', paddingTop: 4 }}>
              <strong>Total Invoice Value (In Words):</strong><br />
              {numberToWords(grand)}
            </div>

            <div style={{ marginTop: 6 }}>
              <strong>Amount of Tax subject to Reverse Charges :</strong> No
            </div>
          </div>

          <div style={S.totalBox}>
            <div style={S.totalRow}>
              <span>Total taxable value</span>
              <span style={{ fontWeight: 'bold' }}>{fmt(taxable)}</span>
            </div>
            <div style={S.totalRow}>
              <span>Total tax</span>
              <span style={{ fontWeight: 'bold' }}>{fmt(totalTax)}</span>
            </div>
            {otherCharges > 0 && (
              <div style={S.totalRow}>
                <span>Other Charges</span>
                <span>{fmt(otherCharges)}</span>
              </div>
            )}
            {invoice.roundOff && invoice.roundOffAmount != null && (
              <div style={S.totalRow}>
                <span>Round Off</span>
                <span>{fmt(invoice.roundOffAmount)}</span>
              </div>
            )}
            <div style={S.grandTotalRow}>
              <span>Grand Total</span>
              <span style={{ fontSize: 12 }}>₹ {fmt(grand)}</span>
            </div>
          </div>
        </div>

        {/* ═══════════════ DECLARATION + SIGNATURE ═══════════════ */}
        <div style={S.footerRow}>
          <div style={S.declaration}>
            <strong>Declaration:</strong> Certified that the above particulars given are true and correct and the amount
            indicated represents the price actually charged and that there is no flow of additional
            consideration directly or indirectly from the buyer.

            {invoice.remarks && (
              <div style={{ marginTop: 6 }}>
                <strong>Remarks:</strong> {invoice.remarks}
              </div>
            )}
          </div>
          <div style={S.signatureBox}>
            <div style={{ fontWeight: 'bold', fontSize: 10 }}>FOR {tn.toUpperCase()},</div>
            <div style={{ marginTop: 36 }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: 3, fontSize: 9 }}>
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════ TERMS (Condition + Notice) ═══════════════ */}
        <div style={{ borderTop: '1px solid #000', padding: '6px 8px', fontSize: 8, lineHeight: 1.5, color: '#333' }}>
          <strong>Condition:</strong> Since human errors and unprecedented power and calamitic conditions can create
          flaw which might skip our attention at times. Doubly check the status of the products before use and ensure
          that this is an accord which your requirement once our product have been used by you will no longer
          acknowledge responsibility your subsequently find them to be incorrect for our production.
          <br /><br />
          <strong>Notice:</strong> Our products are sensitive to abrasion and heat. Do test this product under actual
          production condition, such as washing, dyeing and/or ironing to ensure that washing process, chemical
          and/or temperature do not cause the products distortion, and/or bleeding on/to garments.
          <strong> {tn}</strong> does not guarantee the products for special garment treatment or press temperature
          above 110°C. For further information please contact our customer service cell at Phone no: +91 {tenantPhone}
          <br /><br />
          <strong>Terms:</strong> Goods once sold will not be taken back or replaced. If payment not made within 30 days,
          interest @ 24% per annum will be charged extra. All disputes are subject to Tirupur jurisdiction.
          Your payments should be in favour of <strong>{invoice.tenantBankAccountName || tn}</strong>.
        </div>

      </div>
    </div>
  );
});

InvoicePrintTemplate.displayName = 'InvoicePrintTemplate';
export default InvoicePrintTemplate;
