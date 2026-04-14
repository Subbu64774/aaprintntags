import { forwardRef } from 'react';

const fmt = (v) => Number(v || 0).toFixed(2);

/* ─────── High-quality print styles ─────── */
const S = {
  page: {
    width: '210mm',
    minHeight: '297mm',
    padding: '18mm 16mm 14mm 16mm',
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    fontSize: 11,
    color: '#222',
    background: '#fff',
    lineHeight: 1.5,
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    textRendering: 'optimizeLegibility',
  },

  /* Header */
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  logoArea: { display: 'flex', alignItems: 'center', gap: 14 },
  logo: { height: 64, width: 'auto', objectFit: 'contain', imageRendering: 'auto' },
  tenantName: { fontSize: 22, fontWeight: 700, color: '#1a3a6b', margin: 0, letterSpacing: '-0.3px' },
  tenantSub: { fontSize: 10, color: '#666', marginTop: 1, lineHeight: 1.4 },
  invoiceTitle: { textAlign: 'right' },
  invoiceBig: { fontSize: 26, fontWeight: 800, color: '#1a3a6b', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' },
  metaLabel: { color: '#888', display: 'block', fontSize: 8.5, marginBottom: 0, textTransform: 'uppercase', letterSpacing: '0.5px' },
  metaVal: { fontWeight: 700, fontSize: 12.5, color: '#222' },

  /* Divider */
  dividerBlue: { borderTop: '3px solid #1a3a6b', margin: '10px 0 14px 0' },

  /* Address boxes */
  addrRow: { display: 'flex', gap: 16, marginBottom: 16 },
  addrBox: { flex: 1, background: '#f6f8fb', border: '1px solid #dde3ec', borderRadius: 6, padding: '10px 12px' },
  addrTitle: { fontSize: 8.5, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4, borderBottom: '1px solid #dde3ec', paddingBottom: 3 },
  addrBold: { fontSize: 11.5, fontWeight: 700, color: '#222' },
  addrText: { fontSize: 10.5, lineHeight: 1.45, color: '#444', marginTop: 2 },

  /* Table */
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: 16, border: '1px solid #dde3ec' },
  th: { background: '#1a3a6b', color: '#fff', padding: '7px 8px', fontSize: 9, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid rgba(255,255,255,0.15)' },
  thR: { background: '#1a3a6b', color: '#fff', padding: '7px 8px', fontSize: 9, fontWeight: 700, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '6px 8px', borderBottom: '1px solid #e8ecf2', fontSize: 10.5, color: '#333' },
  tdR: { padding: '6px 8px', borderBottom: '1px solid #e8ecf2', fontSize: 10.5, textAlign: 'right', color: '#333' },

  /* Summary section */
  sumWrap: { display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 16 },
  bankBox: { flex: 1, border: '1px solid #dde3ec', borderRadius: 6, padding: '10px 12px', background: '#f6f8fb' },
  bankTitle: { fontSize: 10, fontWeight: 700, color: '#1a3a6b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #dde3ec', paddingBottom: 4 },
  bankRow: { fontSize: 10.5, lineHeight: 1.8, color: '#333' },
  bankLabel: { color: '#666', display: 'inline-block', width: 125, fontWeight: 600 },
  sumBox: { width: 280, fontSize: 10.5 },
  sumRow: { display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#444' },
  sumDiv: { borderTop: '1px solid #dde3ec', margin: '4px 0' },
  grandRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px 0', fontWeight: 800, fontSize: 14, borderTop: '3px solid #1a3a6b', marginTop: 4, color: '#1a3a6b' },

  /* Sections */
  sectionTitle: { fontSize: 10, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3, marginTop: 12 },
  sectionText: { fontSize: 8.5, lineHeight: 1.6, color: '#555', textAlign: 'justify' },

  /* Footer */
  footer: { marginTop: 18, paddingTop: 10, borderTop: '2px solid #dde3ec', fontSize: 9, color: '#999', textAlign: 'center', letterSpacing: '0.3px' },
  signatureArea: { display: 'flex', justifyContent: 'space-between', marginTop: 30, paddingTop: 10 },
  signatureBlock: { textAlign: 'center', width: 200 },
  signatureLine: { borderTop: '1px solid #999', marginTop: 40, paddingTop: 4, fontSize: 9, color: '#666' },
};

const InvoicePrintTemplate = forwardRef(({ invoice }, ref) => {
  if (!invoice) return null;

  const items = (invoice.invoiceProductDTOList || []).map((item, idx) => ({
    ...item, sn: idx + 1, lineTotal: (item.quantity || 0) * (item.price || 0),
  }));

  const subTotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const dc = invoice.deliveryCharges || 0;
  const taxable = subTotal + dc;
  const cgP = invoice.cgst || 0, sgP = invoice.sgst || 0, igP = invoice.igst || 0;
  const cgA = taxable * (cgP / 100), sgA = taxable * (sgP / 100), igA = taxable * (igP / 100);
  const grand = taxable + cgA + sgA + igA;

  const tn = invoice.tenantName || '';
  const tp = invoice.tenantPhone || '';

  // Determine logo source: use tenant logo URL or fallback to default
  const logoSrc = invoice.tenantLogoUrl || '/aaprintntags_logo.png';

  return (
    <div ref={ref} style={S.page}>

      {/* ═══════════════ HEADER ═══════════════ */}
      <div style={S.headerRow}>
        <div>
          <div style={S.logoArea}>
            <img
              src={logoSrc}
              alt="Logo"
              style={S.logo}
            />
            <div>
              <h1 style={S.tenantName}>{tn}</h1>
              {invoice.productionUnitName && (
                <div style={S.tenantSub}>{invoice.productionUnitName}</div>
              )}
              {invoice.productionUnitAddress && (
                <div style={S.tenantSub}>{invoice.productionUnitAddress}</div>
              )}
            </div>
          </div>
          {invoice.tenantGstNumber && (
            <div style={{ fontSize: 10.5, color: '#444', marginTop: 4, fontWeight: 600 }}>
              GSTIN: {invoice.tenantGstNumber}
            </div>
          )}
          {invoice.tenantRegisteredAddress && (
            <div style={{ fontSize: 9, color: '#666', marginTop: 3 }}>
              Regd. Office: {invoice.tenantRegisteredAddress}
            </div>
          )}
        </div>
        <div style={S.invoiceTitle}>
          <h2 style={S.invoiceBig}>Invoice</h2>
          <div style={{ marginTop: 6 }}>
            <span style={S.metaLabel}>Invoice #</span>
            <span style={S.metaVal}>{invoice.invoiceNumber}</span>
          </div>
          <div style={{ marginTop: 5 }}>
            <span style={S.metaLabel}>Date</span>
            <span style={S.metaVal}>{invoice.invoiceDate || '-'}</span>
          </div>
          <div style={{ marginTop: 5 }}>
            <span style={S.metaLabel}>PO Number</span>
            <span style={S.metaVal}>{invoice.poNumber || '-'}</span>
          </div>
        </div>
      </div>
      <div style={S.dividerBlue} />

      {/* ═══════════════ ADDRESSES ═══════════════ */}
      <div style={S.addrRow}>
        <div style={S.addrBox}>
          <div style={S.addrTitle}>Bill To</div>
          <div style={S.addrBold}>{invoice.customerName}</div>
          <div style={S.addrText}>{invoice.billToAddress || '-'}</div>
        </div>
        <div style={S.addrBox}>
          <div style={S.addrTitle}>Ship To</div>
          <div style={S.addrBold}>{invoice.customerName}</div>
          <div style={S.addrText}>{invoice.shipToAddress || '-'}</div>
        </div>
      </div>

      {/* ═══════════════ LINE ITEMS TABLE ═══════════════ */}
      <table style={S.table}>
        <thead>
          <tr>
            <th style={{ ...S.th, width: 28, textAlign: 'center' }}>#</th>
            <th style={{ ...S.th, minWidth: 100 }}>Product</th>
            <th style={S.th}>HSN</th>
            <th style={S.th}>Size</th>
            <th style={{ ...S.th, minWidth: 80 }}>Description</th>
            <th style={{ ...S.thR, width: 60 }}>Qty</th>
            <th style={{ ...S.thR, width: 80 }}>Price</th>
            <th style={{ ...S.thR, width: 90 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.sn} style={it.sn % 2 === 0 ? { background: '#f9fafb' } : {}}>
              <td style={{ ...S.td, textAlign: 'center', fontWeight: 600, color: '#888' }}>{it.sn}</td>
              <td style={{ ...S.td, fontWeight: 600 }}>{it.productName || '-'}</td>
              <td style={S.td}>{it.hsnCode || '-'}</td>
              <td style={S.td}>{it.size || '-'}</td>
              <td style={S.td}>{it.description || '-'}</td>
              <td style={S.tdR}>{it.quantity}</td>
              <td style={S.tdR}>₹ {fmt(it.price)}</td>
              <td style={{ ...S.tdR, fontWeight: 600 }}>₹ {fmt(it.lineTotal)}</td>
            </tr>
          ))}
          {/* Total row at bottom of table */}
          <tr style={{ background: '#eef2f7' }}>
            <td colSpan={7} style={{ ...S.td, textAlign: 'right', fontWeight: 700, borderBottom: 'none', fontSize: 11, color: '#1a3a6b' }}>
              Total
            </td>
            <td style={{ ...S.tdR, fontWeight: 700, borderBottom: 'none', fontSize: 11, color: '#1a3a6b' }}>
              ₹ {fmt(subTotal)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══════════════ BANK DETAILS + SUMMARY ═══════════════ */}
      <div style={S.sumWrap}>
        <div style={S.bankBox}>
          <div style={S.bankTitle}>Bank Details</div>
          <div style={S.bankRow}><span style={S.bankLabel}>Bank Name</span>: {invoice.tenantBankName || '-'}</div>
          <div style={S.bankRow}><span style={S.bankLabel}>Account Holder</span>: {invoice.tenantBankAccountName || tn}</div>
          <div style={S.bankRow}><span style={S.bankLabel}>Account Number</span>: {invoice.tenantBankAccountNumber || '-'}</div>
          <div style={S.bankRow}><span style={S.bankLabel}>IFSC Code</span>: {invoice.tenantBankIfsc || '-'}</div>
          <div style={S.bankRow}><span style={S.bankLabel}>GST No</span>: {invoice.tenantGstNumber || '-'}</div>
        </div>
        <div style={S.sumBox}>
          <div style={S.sumRow}><span>Sub Total</span><span style={{ fontWeight: 600 }}>₹ {fmt(subTotal)}</span></div>
          {dc > 0 && <div style={S.sumRow}><span>Delivery Charges</span><span style={{ fontWeight: 600 }}>₹ {fmt(dc)}</span></div>}
          <div style={S.sumDiv} />
          <div style={S.sumRow}><span style={{ fontWeight: 600 }}>Taxable Amount</span><span style={{ fontWeight: 700 }}>₹ {fmt(taxable)}</span></div>
          {cgP > 0 && <div style={S.sumRow}><span style={{ color: '#666', paddingLeft: 8 }}>CGST ({cgP}%)</span><span>₹ {fmt(cgA)}</span></div>}
          {sgP > 0 && <div style={S.sumRow}><span style={{ color: '#666', paddingLeft: 8 }}>SGST ({sgP}%)</span><span>₹ {fmt(sgA)}</span></div>}
          {igP > 0 && <div style={S.sumRow}><span style={{ color: '#666', paddingLeft: 8 }}>IGST ({igP}%)</span><span>₹ {fmt(igA)}</span></div>}
          <div style={S.grandRow}><span>Grand Total</span><span>₹ {fmt(grand)}</span></div>
        </div>
      </div>

      {/* ═══════════════ REMARKS ═══════════════ */}
      {invoice.remarks && (
        <div style={{ marginBottom: 8, fontSize: 10.5, color: '#444', background: '#fffbf0', border: '1px solid #ffe7ba', borderRadius: 4, padding: '6px 10px' }}>
          <strong style={{ color: '#d48806' }}>Remarks:</strong> {invoice.remarks}
        </div>
      )}

      {/* ═══════════════ CONDITION ═══════════════ */}
      <div style={S.sectionTitle}>Condition</div>
      <div style={S.sectionText}>
        Since human errors and unprecedented power and calamitic conditions can create
        flaw which might skip our attention at times. Doubly check the status of the products
        before use and ensure that this is an accord which your requirement once our product
        have been used by you will no longer acknowledge responsibility your subsequently
        find them to be incorrect for our production. Therefore please co-operate with us
        in assuring that our products are correct you use them.
      </div>

      {/* ═══════════════ NOTICE ═══════════════ */}
      <div style={S.sectionTitle}>Notice</div>
      <div style={S.sectionText}>
        Our products are sensitive to abrasion and heat. Do test this product under actual
        production condition, such as washing, dyeing and/or ironing to ensure that washing
        process, chemical and/or temperature do not cause the products distortion, and/or
        bleeding on/to garments. <strong>{tn}</strong> does not guarantee the products for special
        garment treatment or press temperature above 110°C. For further information
        please contact our customer service cell at Phone no: +91 {tp}
      </div>

      {/* ═══════════════ TERMS AND CONDITIONS ═══════════════ */}
      <div style={S.sectionTitle}>Terms and Conditions</div>
      <div style={S.sectionText}>
        Goods once sold will not be taken back or replaced. If payment not made within 30 days,
        interest @ 24% per annum will be charged extra. All disputes are subject to Tirupur
        jurisdiction. Our responsibility is limited to our products only. All payments should be
        made by account payee cheque or draft only.
        <br />
        Your payments should be in favour of <strong>{invoice.tenantBankAccountName || tn}</strong>
      </div>

      <div style={{ marginTop: 10, fontSize: 9.5, color: '#777', fontStyle: 'italic' }}>
        *Please check the Delivery Challan
      </div>

      {/* ═══════════════ SIGNATURE ═══════════════ */}
      <div style={S.signatureArea}>
        <div style={S.signatureBlock}>
          <div style={S.signatureLine}>Customer Signature</div>
        </div>
        <div style={S.signatureBlock}>
          <div style={S.signatureLine}>For <strong>{tn}</strong></div>
        </div>
      </div>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <div style={S.footer}>
        This is a computer-generated invoice and does not require a physical signature.
      </div>
    </div>
  );
});

InvoicePrintTemplate.displayName = 'InvoicePrintTemplate';
export default InvoicePrintTemplate;

