-- Test data for AA PRINT N TAGS (tenant_id picked dynamically by DataSeeder)
-- This file is executed by DataSeeder, NOT by Spring auto-init

-- ========== CUSTOMERS ==========
INSERT INTO customers (customer_name, phone, email, gst_number, current_address, billing_address, delivery_address, tenant_id, deleted, created_by, created_at) VALUES
('Lakshmi Textiles',       '9845012345', 'lakshmi@textiles.com',       '27AABCL5678D1Z3', '56, Nehru Street, T.Nagar, Chennai',       '56, Nehru Street, T.Nagar, Chennai',       'Same as billing',                      :tid, 0, 'SEED', NOW()),
('Murugan Sweets',         '9876501234', 'orders@murugansweets.com',   '33AABCM9012E1Z7', '12, Mount Road, Mylapore, Chennai',        '12, Mount Road, Mylapore, Chennai',        '15, Warehouse Rd, Guindy, Chennai',    :tid, 0, 'SEED', NOW()),
('Sri Balaji Electronics',  '9988776655', 'balaji@electronics.in',     '33AADFS1234H1Z2', '78, Ranganathan St, Porur, Chennai',       '78, Ranganathan St, Porur, Chennai',       'Same as billing',                      :tid, 0, 'SEED', NOW()),
('Anbu Pharma',            '9123456789', 'contact@anbupharma.com',     '33AABCA7890J1Z1', '3, Poonamallee High Road, Chennai',        '3, Poonamallee High Road, Chennai',        '67, Ambattur Industrial Estate',       :tid, 0, 'SEED', NOW()),
('Kavitha Garments',       '9012345678', 'kavitha@garments.co',        '33AABCK3456L1Z9', '22, Usman Road, T.Nagar, Chennai',         '22, Usman Road, T.Nagar, Chennai',         'Same as billing',                      :tid, 0, 'SEED', NOW()),
('Ravi Auto Parts',        '9871234567', 'ravi@autoparts.in',          '33AABCR6789M1Z4', '90, Industrial Estate, Ambattur',          '90, Industrial Estate, Ambattur',          '12, Warehouse Complex, Redhills',      :tid, 0, 'SEED', NOW()),
('Devi Silks',             '9765432100', 'info@devisilks.com',         '33AABCD2345N1Z8', '5, Silk Bazar, Kanchipuram',               '5, Silk Bazar, Kanchipuram',               'Same as billing',                      :tid, 0, 'SEED', NOW()),
('Chennai Spices Export',  '9654321098', 'export@chennaispices.com',   '33AABCC4567P1Z6', '34, Harbour Area, Royapuram',              '34, Harbour Area, Royapuram',              '78, Port Trust, Chennai',              :tid, 0, 'SEED', NOW()),
('Senthil Hardware',       '9543210987', 'senthil@hardware.co.in',     '33AABCS5678Q1Z5', '67, Broadway, Parrys Corner',              '67, Broadway, Parrys Corner',              'Same as billing',                      :tid, 0, 'SEED', NOW()),
('GreenLeaf Organics',    '9432109876', 'orders@greenleaf.org',        '33AABCG7890R1Z3', '11, ECR Road, Thiruvanmiyur, Chennai',     '11, ECR Road, Thiruvanmiyur, Chennai',     '45, Cold Storage, Sholinganallur',     :tid, 0, 'SEED', NOW());

-- ========== PRODUCTS ==========
INSERT INTO product (product_name, product_size, product_price, hsn_code, additional_works, tenant_id, deleted, created_by, created_at) VALUES
('Barcode Label 50x25mm',      '50mm x 25mm',   '1.50',  '4821', 'Thermal printing',                          :tid, 0, 'SEED', NOW()),
('Barcode Label 100x50mm',     '100mm x 50mm',  '3.00',  '4821', 'Thermal printing, Lamination',              :tid, 0, 'SEED', NOW()),
('Woven Label - Satin',        '30mm x 60mm',   '5.00',  '5807', 'Satin weave, Color printing',               :tid, 0, 'SEED', NOW()),
('Hang Tag - Card',            '80mm x 40mm',   '2.50',  '4821', '300GSM art card, Die-cut, Foiling',         :tid, 0, 'SEED', NOW()),
('Printed Sticker Roll',       '75mm x 75mm',   '2.00',  '4821', 'BOPP material, Glossy lamination',          :tid, 0, 'SEED', NOW()),
('Care Label - Nylon',         '25mm x 40mm',   '1.00',  '5807', 'Nylon taffeta, Wash-proof',                 :tid, 0, 'SEED', NOW()),
('Hologram Sticker',           '20mm x 20mm',   '8.00',  '4821', 'Security hologram, Tamper-proof',           :tid, 0, 'SEED', NOW()),
('Packaging Box Sticker A4',   '210mm x 297mm', '12.00', '4821', 'Vinyl, Waterproof, Full color',             :tid, 0, 'SEED', NOW()),
('Fabric Tag - Cotton',        '40mm x 70mm',   '3.50',  '5807', 'Cotton canvas, Screen print',               :tid, 0, 'SEED', NOW()),
('Price Tag - Jewellery',      '25mm x 50mm',   '1.80',  '4821', 'Art paper, Gold foil, Barcode',             :tid, 0, 'SEED', NOW()),
('Shipping Label A6',          '105mm x 148mm', '4.00',  '4821', 'Direct thermal, Adhesive back',             :tid, 0, 'SEED', NOW()),
('MRP Sticker Round',          '25mm dia',      '0.60',  '4821', 'Paper, Permanent adhesive',                 :tid, 0, 'SEED', NOW());

