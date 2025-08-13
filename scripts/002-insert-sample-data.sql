-- Insert sample sidebar structure
INSERT INTO sidebar_items (name, parent_id, item_type) VALUES 
('Root', NULL, 'folder'),
('Tables', 1, 'folder'),
('Reports', 1, 'folder');

-- Insert sample dynamic table
INSERT INTO dynamic_tables (name, display_name) VALUES 
('users', 'User Management');

-- Insert sample columns for users table
INSERT INTO table_columns (table_id, column_name, display_name, data_type, column_order) VALUES 
(1, 'name', 'Full Name', 'text', 1),
(1, 'email', 'Email Address', 'text', 2),
(1, 'age', 'Age', 'number', 3),
(1, 'active', 'Active Status', 'boolean', 4),
(1, 'created_date', 'Created Date', 'date', 5);

-- Link table to sidebar
INSERT INTO sidebar_items (name, parent_id, item_type, table_id) VALUES 
('Users', 2, 'table', 1);

-- Insert sample data
INSERT INTO table_data (table_id, row_data) VALUES 
(1, '{"name": "John Doe", "email": "john@example.com", "age": 30, "active": true, "created_date": "2024-01-15"}'),
(1, '{"name": "Jane Smith", "email": "jane@example.com", "age": 25, "active": true, "created_date": "2024-01-20"}'),
(1, '{"name": "Bob Johnson", "email": "bob@example.com", "age": 35, "active": false, "created_date": "2024-01-10"}');
