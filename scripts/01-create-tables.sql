-- Create the main tables for the dynamic database management system

-- Table to store sidebar items (folders and tables)
CREATE TABLE IF NOT EXISTS sidebar_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('folder', 'table')),
    parent_id INTEGER REFERENCES sidebar_items(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store dynamic table definitions
CREATE TABLE IF NOT EXISTS dynamic_tables (
    id SERIAL PRIMARY KEY,
    sidebar_item_id INTEGER REFERENCES sidebar_items(id) ON DELETE CASCADE,
    table_name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store column definitions for dynamic tables
CREATE TABLE IF NOT EXISTS table_columns (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES dynamic_tables(id) ON DELETE CASCADE,
    column_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('text', 'number', 'decimal', 'double', 'boolean', 'date', 'datetime', 'checkbox')),
    is_required BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(table_id, column_name)
);

-- Table to store actual data for dynamic tables
CREATE TABLE IF NOT EXISTS table_data (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES dynamic_tables(id) ON DELETE CASCADE,
    row_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sidebar_items_parent ON sidebar_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_sidebar_items_type ON sidebar_items(type);
CREATE INDEX IF NOT EXISTS idx_dynamic_tables_sidebar ON dynamic_tables(sidebar_item_id);
CREATE INDEX IF NOT EXISTS idx_table_columns_table ON table_columns(table_id);
CREATE INDEX IF NOT EXISTS idx_table_data_table ON table_data(table_id);
CREATE INDEX IF NOT EXISTS idx_table_data_jsonb ON table_data USING GIN(row_data);
