-- Seed initial data for the dynamic database app

-- Insert root sidebar items
INSERT INTO sidebar_items (name, parent_id, item_type, icon, sort_order) VALUES
('Tables', NULL, 'folder', 'folder', 1),
('Reports', NULL, 'folder', 'chart-bar', 2)
ON CONFLICT DO NOTHING;

-- Insert sample table
INSERT INTO dynamic_tables (sidebar_item_id, table_name, display_name, description)
SELECT 
  si.id,
  'sample_customers',
  'Sample Customers',
  'A sample customer table to demonstrate the system'
FROM sidebar_items si 
WHERE si.name = 'Tables' AND si.parent_id IS NULL
ON CONFLICT (table_name) DO NOTHING;

-- Insert sample table item in sidebar
INSERT INTO sidebar_items (name, parent_id, item_type, icon, sort_order)
SELECT 
  'Sample Customers',
  si.id,
  'table',
  'table',
  1
FROM sidebar_items si 
WHERE si.name = 'Tables' AND si.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Insert sample columns for the customer table
INSERT INTO table_columns (table_id, column_name, display_name, data_type, is_required, sort_order, width)
SELECT 
  dt.id,
  column_name,
  display_name,
  data_type,
  is_required,
  sort_order,
  width
FROM dynamic_tables dt,
(VALUES 
  ('id', 'ID', 'number', true, 1, 80),
  ('name', 'Customer Name', 'text', true, 2, 200),
  ('email', 'Email', 'text', true, 3, 250),
  ('phone', 'Phone', 'text', false, 4, 150),
  ('active', 'Active', 'boolean', false, 5, 100),
  ('created_date', 'Created Date', 'date', false, 6, 150),
  ('balance', 'Balance', 'decimal', false, 7, 120)
) AS cols(column_name, display_name, data_type, is_required, sort_order, width)
WHERE dt.table_name = 'sample_customers'
ON CONFLICT (table_id, column_name) DO NOTHING;

-- Insert sample data
INSERT INTO table_data (table_id, row_data)
SELECT 
  dt.id,
  row_data::jsonb
FROM dynamic_tables dt,
(VALUES 
  ('{"id": 1, "name": "John Doe", "email": "john@example.com", "phone": "+1-555-0101", "active": true, "created_date": "2024-01-15", "balance": 1250.50}'),
  ('{"id": 2, "name": "Jane Smith", "email": "jane@example.com", "phone": "+1-555-0102", "active": true, "created_date": "2024-01-20", "balance": 2100.75}'),
  ('{"id": 3, "name": "Bob Johnson", "email": "bob@example.com", "phone": "+1-555-0103", "active": false, "created_date": "2024-01-10", "balance": 0.00}')
) AS sample_data(row_data)
WHERE dt.table_name = 'sample_customers'
ON CONFLICT DO NOTHING;
