#!/usr/bin/env python3
"""
Migration script: Converts old MySQL DB (aaprinpj_tagsnaap_print) -> new aaprintntags schema.
Section-based extraction to avoid cross-table data bleed.
"""
import re, sys
from datetime import datetime
from collections import OrderedDict

INPUT  = "/Users/subramanianganesan/Downloads/localhost.sql"
OUTPUT = "/Users/subramanianganesan/Downloads/Archive/aaprintntags/migration.sql"

def extract_section(lines, tbl):
    out = []
    active = False
    for ln in lines:
        if f"INSERT INTO `{tbl}`" in ln:
            active = True
            out.append(ln)
            continue
        if active:
            if ln.startswith('--') or ln.startswith('/*!') or (ln.strip()=='' and out and out[-1].strip()==''):
                active = False
                continue
            out.append(ln)
    return '\n'.join(out)

def parse_rows(section, tbl):
    rows = []
    pat = rf"INSERT INTO `{re.escape(tbl)}` \(([^)]+)\) VALUES"
    for m in re.finditer(pat, section):
        cols = [c.strip().strip('`') for c in m.group(1).split(',')]
        sp = m.end()
        ni = section.find(f"INSERT INTO `{tbl}`", sp)
        vt = section[sp:] if ni == -1 else section[sp:ni]
        i = 0
        while i < len(vt):
            if vt[i] == '(':
                d, ins, esc, j = 0, False, False, i
                while j < len(vt):
                    c = vt[j]
                    if esc: esc=False; j+=1; continue
                    if c=='\\': esc=True; j+=1; continue
                    if c=="'" and not esc: ins = not ins
                    elif not ins:
                        if c=='(': d+=1
                        elif c==')':
                            d-=1
                            if d==0:
                                rv = pv(vt[i+1:j])
                                if len(rv)==len(cols): rows.append(dict(zip(cols,rv)))
                                j+=1; break
                    j+=1
                i=j
            else: i+=1
    return rows

def pv(s):
    vals=[]; i=0; cur=''; ins=False; esc=False
    while i<len(s):
        c=s[i]
        if esc: cur+=c; esc=False; i+=1; continue
        if c=='\\': esc=True; i+=1; continue
        if c=="'" and not ins: ins=True; i+=1; continue
        elif c=="'" and ins:
            if i+1<len(s) and s[i+1]=="'": cur+="'"; i+=2; continue
            ins=False; i+=1; continue
        elif c==',' and not ins:
            v=cur.strip(); vals.append(None if v=='NULL' else v); cur=''; i+=1; continue
        else: cur+=c; i+=1
    v=cur.strip(); vals.append(None if v=='NULL' else v)
    return vals

def esq(v):
    if v is None: return 'NULL'
    return "'"+str(v).replace("'","''")+"'"

def td(v):
    if v is None: return 'NULL'
    try: return str(round(float(v),2))
    except: return 'NULL'

def tdt(v):
    if v is None: return 'NULL'
    return f"'{v}'"

def ss(v, d=''):
    return str(v).strip() if v is not None else d

def main():
    print("Reading SQL file...")
    with open(INPUT,'r',encoding='utf-8',errors='replace') as f:
        lines = f.readlines()

    print("Extracting sections...")
    secs = {}
    for t in ['label','podetails','poproduct','invoicedetails','invoiceproducts','paymentprocess','login']:
        secs[t] = extract_section(lines, t)

    print("Parsing tables...")
    labels      = parse_rows(secs['label'],          'label')
    podetails   = parse_rows(secs['podetails'],      'podetails')
    poproducts  = parse_rows(secs['poproduct'],      'poproduct')
    invoices_r  = parse_rows(secs['invoicedetails'],  'invoicedetails')
    invprods_r  = parse_rows(secs['invoiceproducts'], 'invoiceproducts')
    payments_r  = parse_rows(secs['paymentprocess'],  'paymentprocess')
    logins      = parse_rows(secs['login'],           'login')
    for n,d in [('label',labels),('podetails',podetails),('poproduct',poproducts),
                ('invoicedetails',invoices_r),('invoiceproducts',invprods_r),
                ('paymentprocess',payments_r),('login',logins)]:
        print(f"  {n}: {len(d)} rows")

    # === CUSTOMERS (unique from PO + Invoice) ===
    print("\nBuilding customers...")
    custs = OrderedDict()
    for po in podetails:
        nm = ss(po.get('poindustryname'))
        if not nm: continue
        k = nm.upper()
        if k not in custs:
            custs[k] = {'name':nm,'phone':ss(po.get('pomobile')),'email':ss(po.get('poemail')),
                        'address':ss(po.get('poaddress')),'gst':ss(po.get('pogst'))}
    for iv in invoices_r:
        nm = ss(iv.get('industryname'))
        if not nm: continue
        k = nm.upper()
        if k not in custs:
            custs[k] = {'name':nm,'phone':ss(iv.get('mobile')),'email':ss(iv.get('email')),
                        'address':ss(iv.get('address')),'gst':ss(iv.get('gst'))}
    cid_map = {}; clist = []
    for i,(k,c) in enumerate(custs.items(),1):
        cid_map[k]=i; c['id']=i; clist.append(c)
    print(f"  Customers: {len(clist)}")

    # === PRODUCTS (deduplicated labels) ===
    print("Building products...")
    pname_map = {}; plist = []; seen = set()
    for lab in labels:
        nm = ss(lab.get('labname')); nu = nm.upper()
        if nu in seen: continue
        seen.add(nu)
        pid = len(plist)+1
        pname_map[nu] = pid
        plist.append({'id':pid,'name':nm,'size':ss(lab.get('labsize')),
                      'price':ss(lab.get('labprice')),'hsn':ss(lab.get('hsncode')),
                      'addl':ss(lab.get('additionalworks'))})
    print(f"  Products: {len(plist)}")

    # === ORDERS (from podetails) ===
    print("Building orders...")
    ponum_map = {}; olist = []
    for i,po in enumerate(podetails,1):
        pn = ss(po.get('ponumber')); ponum_map[pn]=i
        cn = ss(po.get('poindustryname')); ci = cid_map.get(cn.upper()) if cn else None
        try:
            sub=float(ss(po.get('subtotal'),'0') or 0)
            sp=float(ss(po.get('sgst'),'0') or 0); cp=float(ss(po.get('cgst'),'0') or 0)
            ip=float(ss(po.get('igst'),'0') or 0); gr=float(ss(po.get('grandtotal'),'0') or 0)
            sa=sub*sp/100 if sp>0 else 0; ca=sub*cp/100 if cp>0 else 0; ia=sub*ip/100 if ip>0 else 0
        except: sa=ca=ia=gr=0
        comp = ss(po.get('completion'),'0')
        st = 'COMPLETED' if comp=='1' else 'PENDING'
        olist.append({'id':i,'po':pn,'dt':po.get('podate'),'cid':ci,'amt':gr,
                      'sg':sa,'cg':ca,'ig':ia,'st':st,'addr':ss(po.get('poaddress'))})
    print(f"  Orders: {len(olist)}")

    # === ORDER PRODUCTS ===
    print("Building order products...")
    oplist = []
    for pop in poproducts:
        pn = ss(pop.get('ponumber')); oid = ponum_map.get(pn)
        if not oid: continue
        nm = ss(pop.get('popname')); pid = pname_map.get(nm.upper())
        try:
            q=int(float(ss(pop.get('poqty'),'0') or 0)); pr=float(ss(pop.get('popprice'),'0') or 0)
            bq=int(float(ss(pop.get('pobalqty'),'0') or 0)); dq=q-bq if q>=bq else q
        except: q=0;pr=0;dq=0
        sz = ss(pop.get('popsdesc'))
        oplist.append({'id':len(oplist)+1,'oid':oid,'pid':pid,'q':q,'pr':pr,
                       'sz':sz if sz and sz!='-' else None,'desc':nm,'dq':dq})
    print(f"  Order products: {len(oplist)}")

    # === INVOICES ===
    print("Building invoices...")
    ilist = []; iid_map = {}
    for idx,iv in enumerate(invoices_r,1):
        ono = ss(iv.get('invoiceno')); nno = ss(iv.get('new_invoicenumber'))
        dn = nno if nno else ono; iid_map[ono]=idx
        cn = ss(iv.get('industryname')); ci = cid_map.get(cn.upper()) if cn else None
        pn = ss(iv.get('ponumber')); oid = ponum_map.get(pn)
        frt = ss(iv.get('freightfee'),'0'); fsc = ss(iv.get('fsc'),'0')
        try:
            sub=float(ss(iv.get('subtotal'),'0') or 0)
            sp=float(ss(iv.get('sgst'),'0') or 0); cp=float(ss(iv.get('cgst'),'0') or 0)
            ipp=float(ss(iv.get('igst'),'0') or 0); gr=float(ss(iv.get('grandtotal'),'0') or 0)
            ff=float(frt) if frt else 0
            sa=sub*sp/100 if sp>0 else 0; ca=sub*cp/100 if cp>0 else 0; ia=sub*ipp/100 if ipp>0 else 0
        except: sa=ca=ia=gr=ff=0
        addr = ss(iv.get('address'))
        try: bal=float(ss(iv.get('balpayment'),'0') or 0)
        except: bal=0
        ps = 'PAID' if bal==0 else 'PARTIALLY_PAID'
        ilist.append({'id':idx,'num':dn if dn else f"INV-{ono}",'dt':iv.get('invoicedate'),
                      'oid':oid,'cid':ci,'addr':addr,'sg':sa,'cg':ca,'ig':ia,'dc':ff,
                      'amt':gr,'fsc':fsc=='1','ps':ps,'ono':ono})
    print(f"  Invoices: {len(ilist)}")

    # === INVOICE PRODUCTS ===
    print("Building invoice products...")
    iplist = []
    for ip in invprods_r:
        ino = ss(ip.get('invoiceno')); iid = iid_map.get(ino)
        if not iid: continue
        nm = ss(ip.get('name')); pid = pname_map.get(nm.upper())
        try: q=int(float(ss(ip.get('qty'),'0') or 0)); pr=float(ss(ip.get('price'),'0') or 0)
        except: q=0;pr=0
        sz = ss(ip.get('sdesc'))
        hsn = ''
        if pid:
            for p in plist:
                if p['id']==pid: hsn=p.get('hsn',''); break
        iplist.append({'id':len(iplist)+1,'iid':iid,'pid':pid,'q':q,'pr':pr,
                       'sz':sz if sz and sz!='-' else None,'desc':nm,'hsn':hsn})
    print(f"  Invoice products: {len(iplist)}")

    # === PAYMENTS ===
    print("Building payments...")
    paylist = []
    for pay in payments_r:
        ino = ss(pay.get('invoiceno')); iid = iid_map.get(ino)
        cr = pay.get('credit')
        if cr is None: continue
        try: amt=float(cr)
        except: continue
        if amt<=0 or not iid: continue
        ci = None
        for iv in ilist:
            if iv['id']==iid: ci=iv['cid']; break
        paylist.append({'id':len(paylist)+1,'num':f"PAY-MIG-{len(paylist)+1:05d}",
                        'amt':amt,'iid':iid,'cid':ci,'ino':ino})
    print(f"  Payments: {len(paylist)}")

    # ============ GENERATE SQL ============
    print("\nGenerating SQL...")
    o = []
    o.append("-- ==========================================================")
    o.append("-- MIGRATION: Old aaprinpj_tagsnaap_print -> New aaprintntags")
    o.append(f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    o.append("-- Run AFTER Spring Boot app has created all tables.")
    o.append("-- ==========================================================")
    o.append(""); o.append("SET FOREIGN_KEY_CHECKS = 0;"); o.append("")

    # 1 TENANT
    o.append("-- 1. TENANT")
    o.append("""INSERT INTO tenants (tenant_id, tenant_code, tenant_name, contact_person, contact_email, phone,
  gst_number, business_type, address, city, state, pincode, country,
  active, deleted, created_at, updated_at)
SELECT 1, 'AAPRINTNTAGS', 'AA PRINT N TAGS', 'Admin', 'info@aaprintntags.com', '9585950000',
  NULL, 'Printing', 'Tiruppur', 'Tiruppur', 'Tamil Nadu', '641601', 'India',
  true, false, NOW(), NOW()
FROM dual WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE tenant_id = 1);
""")

    BS = 100

    # 2 PRODUCTS
    o.append(f"-- 2. PRODUCTS ({len(plist)})")
    o.append("")
    for i in range(0, len(plist), BS):
        b = plist[i:i+BS]
        o.append("INSERT INTO product (product_id,tenant_id,product_name,product_size,product_price,hsn_code,additional_works,created_by,created_at,updated_at,deleted) VALUES")
        v = []
        for p in b:
            v.append(f"({p['id']},1,{esq(p['name'])},{esq(p['size'])},{esq(p['price'])},{esq(p['hsn'])},{esq(p['addl'])},'MIGRATION',NOW(),NOW(),false)")
        o.append(",\n".join(v)+";"); o.append("")

    # 3 CUSTOMERS
    o.append(f"-- 3. CUSTOMERS ({len(clist)})")
    o.append("")
    for i in range(0, len(clist), BS):
        b = clist[i:i+BS]
        o.append("INSERT INTO customers (customer_id,tenant_id,customer_name,current_address,billing_address,phone,email,gst_number,created_by,created_at,updated_at,deleted) VALUES")
        v = []
        for c in b:
            v.append(f"({c['id']},1,{esq(c['name'])},{esq(c['address'])},{esq(c['address'])},{esq(c['phone'])},{esq(c['email'])},{esq(c['gst'])},'MIGRATION',NOW(),NOW(),false)")
        o.append(",\n".join(v)+";"); o.append("")

    # 4 ORDERS
    o.append(f"-- 4. PURCHASE ORDERS ({len(olist)})")
    o.append("")
    for i in range(0, len(olist), BS):
        b = olist[i:i+BS]
        o.append("INSERT INTO orders (order_id,tenant_id,po_number,po_date,customer_id,order_date,order_status,order_amount,shipping_address,cgst,sgst,igst,created_by,created_at,updated_at,deleted) VALUES")
        v = []
        for x in b:
            ci = x['cid'] if x['cid'] else 'NULL'
            v.append(f"({x['id']},1,{esq(x['po'])},{tdt(x['dt'])},{ci},{tdt(x['dt'])},{esq(x['st'])},{td(x['amt'])},{esq(x['addr'])},{td(x['cg'])},{td(x['sg'])},{td(x['ig'])},'MIGRATION',NOW(),NOW(),false)")
        o.append(",\n".join(v)+";"); o.append("")

    # 5 ORDER PRODUCTS
    o.append(f"-- 5. ORDER PRODUCTS ({len(oplist)})")
    o.append("")
    for i in range(0, len(oplist), BS):
        b = oplist[i:i+BS]
        o.append("INSERT INTO order_products (order_product_id,order_id,product_id,quantity,price,size,description,delivered_quantity) VALUES")
        v = []
        for x in b:
            pi = x['pid'] if x['pid'] else 'NULL'
            v.append(f"({x['id']},{x['oid']},{pi},{x['q']},{td(x['pr'])},{esq(x['sz'])},{esq(x['desc'])},{x['dq']})")
        o.append(",\n".join(v)+";"); o.append("")

    # 6 STUB ORDERS for orphan invoices
    orphans = [iv for iv in ilist if iv['oid'] is None]
    stub_s = len(olist)+1
    o.append(f"-- 6. STUB ORDERS for orphan invoices ({len(orphans)})")
    o.append("")
    for si,iv in enumerate(orphans):
        sid = stub_s+si; iv['oid']=sid
        ci = iv['cid'] if iv['cid'] else 'NULL'
        o.append(f"INSERT INTO orders (order_id,tenant_id,po_number,po_date,customer_id,order_date,order_status,order_amount,created_by,created_at,updated_at,deleted) VALUES ({sid},1,{esq('STUB-INV-'+str(iv['num']))},{tdt(iv['dt'])},{ci},{tdt(iv['dt'])},'COMPLETED',{td(iv['amt'])},'MIGRATION',NOW(),NOW(),false);")
    o.append("")

    # 7 INVOICES
    o.append(f"-- 7. INVOICES ({len(ilist)})")
    o.append("")
    for i in range(0, len(ilist), BS):
        b = ilist[i:i+BS]
        o.append("INSERT INTO invoices (invoice_id,invoice_number,invoice_date,order_id,customer_id,tenant_id,bill_to_address,ship_to_address,cgst,sgst,igst,delivery_charges,invoice_amount,fsc_invoice,round_off,invoice_status,payment_status,deleted,created_by,created_at,updated_at) VALUES")
        v = []
        for x in b:
            ci = x['cid'] if x['cid'] else 'NULL'
            oi = x['oid'] if x['oid'] else 'NULL'
            fc = 'true' if x['fsc'] else 'false'
            v.append(f"({x['id']},{esq(x['num'])},{tdt(x['dt'])},{oi},{ci},1,{esq(x['addr'])},{esq(x['addr'])},{td(x['cg'])},{td(x['sg'])},{td(x['ig'])},{td(x['dc'])},{td(x['amt'])},{fc},false,'FINALIZED',{esq(x['ps'])},false,'MIGRATION',NOW(),NOW())")
        o.append(",\n".join(v)+";"); o.append("")

    # 8 INVOICE PRODUCTS
    o.append(f"-- 8. INVOICE PRODUCTS ({len(iplist)})")
    o.append("")
    for i in range(0, len(iplist), BS):
        b = iplist[i:i+BS]
        o.append("INSERT INTO invoice_products (invoice_product_id,invoice_id,product_id,quantity,price,size,description,hsn_code) VALUES")
        v = []
        for x in b:
            pi = x['pid'] if x['pid'] else 'NULL'
            v.append(f"({x['id']},{x['iid']},{pi},{x['q']},{td(x['pr'])},{esq(x['sz'])},{esq(x['desc'])},{esq(x['hsn'])})")
        o.append(",\n".join(v)+";"); o.append("")

    # 9 PAYMENTS
    o.append(f"-- 9. PAYMENTS ({len(paylist)})")
    o.append("")
    for i in range(0, len(paylist), BS):
        b = paylist[i:i+BS]
        o.append("INSERT INTO payments (payment_id,payment_number,payment_date,amount,payment_mode,reference_number,remarks,invoice_id,customer_id,tenant_id,deleted,created_by,created_at,updated_at) VALUES")
        v = []
        for x in b:
            ci = x['cid'] if x['cid'] else 'NULL'
            v.append(f"({x['id']},{esq(x['num'])},'2026-01-01',{td(x['amt'])},'OTHER',{esq('Migrated - Invoice #'+x['ino'])},'Auto-migrated from legacy',{x['iid']},{ci},1,false,'MIGRATION',NOW(),NOW())")
        o.append(",\n".join(v)+";"); o.append("")

    # 10 AUTO_INCREMENT
    o.append("-- 10. RESET AUTO-INCREMENT")
    o.append("")
    o.append(f"ALTER TABLE product AUTO_INCREMENT = {len(plist)+100};")
    o.append(f"ALTER TABLE customers AUTO_INCREMENT = {len(clist)+100};")
    o.append(f"ALTER TABLE orders AUTO_INCREMENT = {len(olist)+len(orphans)+100};")
    o.append(f"ALTER TABLE order_products AUTO_INCREMENT = {len(oplist)+100};")
    o.append(f"ALTER TABLE invoices AUTO_INCREMENT = {len(ilist)+100};")
    o.append(f"ALTER TABLE invoice_products AUTO_INCREMENT = {len(iplist)+100};")
    o.append(f"ALTER TABLE payments AUTO_INCREMENT = {len(paylist)+100};")
    o.append(""); o.append("SET FOREIGN_KEY_CHECKS = 1;"); o.append("")
    o.append("-- MIGRATION SUMMARY")
    o.append(f"-- Products:         {len(plist)}")
    o.append(f"-- Customers:        {len(clist)}")
    o.append(f"-- Orders:           {len(olist)} + {len(orphans)} stubs")
    o.append(f"-- Order Products:   {len(oplist)}")
    o.append(f"-- Invoices:         {len(ilist)}")
    o.append(f"-- Invoice Products: {len(iplist)}")
    o.append(f"-- Payments:         {len(paylist)}")

    txt = "\n".join(o)
    with open(OUTPUT,'w',encoding='utf-8') as f: f.write(txt)
    print(f"\n{'='*50}")
    print(f"Migration SQL: {OUTPUT}")
    print(f"Size: {len(txt):,} chars")
    print(f"Products:         {len(plist)}")
    print(f"Customers:        {len(clist)}")
    print(f"Orders:           {len(olist)} + {len(orphans)} stubs")
    print(f"Order Products:   {len(oplist)}")
    print(f"Invoices:         {len(ilist)}")
    print(f"Invoice Products: {len(iplist)}")
    print(f"Payments:         {len(paylist)}")

if __name__=='__main__': main()

