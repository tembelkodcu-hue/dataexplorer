-- Create sidebar_items table for dynamic sidebar structure
CREATE TABLE IF NOT EXISTS sidebar_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES sidebar_items(id) ON DELETE CASCADE,
    item_type VARCHAR(50) DEFAULT 'folder', -- 'folder' or 'table'
    table_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create dynamic_tables table for storing table definitions
CREATE TABLE IF NOT EXISTS dynamic_tables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table_columns table for storing column definitions
CREATE TABLE IF NOT EXISTS table_columns (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES dynamic_tables(id) ON DELETE CASCADE,
    column_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'date', 'boolean', 'decimal', 'double', 'checkbox'
    is_required BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    column_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table_data table for storing actual data
CREATE TABLE IF NOT EXISTS table_data (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES dynamic_tables(id) ON DELETE CASCADE,
    row_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sidebar_items_parent_id ON sidebar_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_table_columns_table_id ON table_columns(table_id);
CREATE INDEX IF NOT EXISTS idx_table_data_table_id ON table_data(table_id);
