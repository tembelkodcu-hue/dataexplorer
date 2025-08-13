-- Create sidebar_items table for the dynamic sidebar
CREATE TABLE IF NOT EXISTS sidebar_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES sidebar_items(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('folder', 'table')),
  icon VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create dynamic_tables table for storing table metadata
CREATE TABLE IF NOT EXISTS dynamic_tables (
  id SERIAL PRIMARY KEY,
  sidebar_item_id INTEGER REFERENCES sidebar_items(id) ON DELETE CASCADE,
  table_name VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create table_columns table for storing column definitions
CREATE TABLE IF NOT EXISTS table_columns (
  id SERIAL PRIMARY KEY,
  table_id INTEGER REFERENCES dynamic_tables(id) ON DELETE CASCADE,
  column_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('text', 'number', 'date', 'boolean', 'decimal', 'double', 'checkbox')),
  is_required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  sort_order INTEGER DEFAULT 0,
  width INTEGER DEFAULT 150,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(table_id, column_name)
);

-- Create table_data table for storing actual table data
CREATE TABLE IF NOT EXISTS table_data (
  id SERIAL PRIMARY KEY,
  table_id INTEGER REFERENCES dynamic_tables(id) ON DELETE CASCADE,
  row_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sidebar_items_parent_id ON sidebar_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_sidebar_items_sort_order ON sidebar_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_dynamic_tables_sidebar_item_id ON dynamic_tables(sidebar_item_id);
CREATE INDEX IF NOT EXISTS idx_table_columns_table_id ON table_columns(table_id);
CREATE INDEX IF NOT EXISTS idx_table_data_table_id ON table_data(table_id);
