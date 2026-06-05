-- Insert Sample Branches
INSERT INTO branches (name, location, phone) VALUES
('فرع الرياض', 'الرياض', '+966501234567'),
('فرع جدة', 'جدة', '+966501234568'),
('فرع المنصورة', 'المنصورة', '+966501234569'),
('فرع الدمام', 'الدمام', '+966501234570');

-- Insert Sample Products
INSERT INTO products (name, category, price, description) VALUES
('بيتزا لحم', 'المأكولات', 45.00, 'بيتزا لذيذة بلحم مفروم'),
('بيتزا جبن', 'المأكولات', 35.00, 'بيتزا بجبن طازج'),
('بيتزا دجاج', 'المأكولات', 40.00, 'بيتزا بدجاج مشوي'),
('جبنة', 'المواد الخام', 150.00, 'جبنة طازجة'),
('دقيق', 'المواد الخام', 50.00, 'دقيق فاخر'),
('صلصة طماطم', 'المواد الخام', 30.00, 'صلصة طماطم'),
('زيت زيتون', 'المواد الخام', 100.00, 'زيت زيتون');

-- Insert Sample Suppliers
INSERT INTO suppliers (name, contact_person, phone, email, city) VALUES
('مورد المواد الأولية 1', 'أحمد محمد', '+966501111111', 'supplier1@example.com', 'الرياض'),
('مورد المواد الأولية 2', 'فاطمة علي', '+966501111112', 'supplier2@example.com', 'جدة'),
('مورد المواد الأولية 3', 'محمود حسن', '+966501111113', 'supplier3@example.com', 'الدمام');

-- Insert Sample Supplier Products
INSERT INTO supplier_products (supplier_id, product_id, unit_price, min_order_qty, delivery_days)
SELECT s.id, p.id, p.price * 0.7, 5, 2
FROM suppliers s, products p
WHERE s.name = 'مورد المواد الأولية 1' AND p.category = 'المواد الخام'
LIMIT 3;
