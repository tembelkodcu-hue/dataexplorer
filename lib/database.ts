import { neon } from "@neondatabase/serverless"

// Use the available environment variable
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

export { sql }

// Database types
export interface SidebarItem {
  id: number
  name: string
  parent_id: number | null
  item_type: "folder" | "table"
  icon?: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DynamicTable {
  id: number
  sidebar_item_id: number
  table_name: string
  display_name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface TableColumn {
  id: number
  table_id: number
  column_name: string
  display_name: string
  data_type: "text" | "number" | "date" | "boolean" | "decimal" | "double" | "checkbox"
  is_required: boolean
  default_value?: string
  sort_order: number
  width: number
  created_at: string
  updated_at: string
}

export interface TableData {
  id: number
  table_id: number
  row_data: Record<string, any>
  created_at: string
  updated_at: string
}

// Database operations
export class DatabaseService {
  // Initialize database tables if they don't exist
  static async initializeTables(): Promise<void> {
    try {
      // Create sidebar_items table
      await sql`
        CREATE TABLE IF NOT EXISTS sidebar_items (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          parent_id INTEGER REFERENCES sidebar_items(id) ON DELETE CASCADE,
          item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('folder', 'table')),
          icon VARCHAR(50),
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `

      // Create dynamic_tables table
      await sql`
        CREATE TABLE IF NOT EXISTS dynamic_tables (
          id SERIAL PRIMARY KEY,
          sidebar_item_id INTEGER REFERENCES sidebar_items(id) ON DELETE CASCADE,
          table_name VARCHAR(255) NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `

      // Create table_columns table
      await sql`
        CREATE TABLE IF NOT EXISTS table_columns (
          id SERIAL PRIMARY KEY,
          table_id INTEGER REFERENCES dynamic_tables(id) ON DELETE CASCADE,
          column_name VARCHAR(255) NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('text', 'number', 'date', 'boolean', 'decimal', 'double', 'checkbox')),
          is_required BOOLEAN DEFAULT FALSE,
          default_value TEXT,
          sort_order INTEGER DEFAULT 0,
          width INTEGER DEFAULT 150,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `

      // Create table_data table
      await sql`
        CREATE TABLE IF NOT EXISTS table_data (
          id SERIAL PRIMARY KEY,
          table_id INTEGER REFERENCES dynamic_tables(id) ON DELETE CASCADE,
          row_data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `

      // Check if we need to seed initial data
      const existingItems = await sql`SELECT COUNT(*) as count FROM sidebar_items`
      if (existingItems[0].count === 0) {
        await this.seedInitialData()
      }
    } catch (error) {
      console.error("Error initializing database tables:", error)
      throw error
    }
  }

  static async seedInitialData(): Promise<void> {
    try {
      // Create root "Tables" folder
      const tablesFolder = await sql`
        INSERT INTO sidebar_items (name, parent_id, item_type, icon, sort_order)
        VALUES ('Tables', NULL, 'folder', 'folder', 0)
        RETURNING *
      `

      // Create sample table sidebar item
      const sampleTableItem = await sql`
        INSERT INTO sidebar_items (name, parent_id, item_type, icon, sort_order)
        VALUES ('Sample Customers', ${tablesFolder[0].id}, 'table', 'table', 0)
        RETURNING *
      `

      // Create the dynamic table
      const dynamicTable = await sql`
        INSERT INTO dynamic_tables (sidebar_item_id, table_name, display_name, description)
        VALUES (${sampleTableItem[0].id}, 'sample_customers', 'Sample Customers', 'A sample customer table to get you started')
        RETURNING *
      `

      // Create sample columns
      await sql`
        INSERT INTO table_columns (table_id, column_name, display_name, data_type, is_required, sort_order, width) VALUES
        (${dynamicTable[0].id}, 'name', 'Customer Name', 'text', true, 0, 200),
        (${dynamicTable[0].id}, 'email', 'Email Address', 'text', true, 1, 250),
        (${dynamicTable[0].id}, 'phone', 'Phone Number', 'text', false, 2, 150),
        (${dynamicTable[0].id}, 'active', 'Active', 'checkbox', false, 3, 100),
        (${dynamicTable[0].id}, 'created_date', 'Created Date', 'date', false, 4, 150)
      `

      // Create sample data
      await sql`
        INSERT INTO table_data (table_id, row_data) VALUES
        (${dynamicTable[0].id}, '{"name": "John Doe", "email": "john@example.com", "phone": "+1-555-0123", "active": true, "created_date": "2024-01-15"}'),
        (${dynamicTable[0].id}, '{"name": "Jane Smith", "email": "jane@example.com", "phone": "+1-555-0124", "active": true, "created_date": "2024-01-16"}'),
        (${dynamicTable[0].id}, '{"name": "Bob Johnson", "email": "bob@example.com", "phone": "+1-555-0125", "active": false, "created_date": "2024-01-17"}')
      `
    } catch (error) {
      console.error("Error seeding initial data:", error)
      throw error
    }
  }

  static async getSidebarItems(): Promise<SidebarItem[]> {
    try {
      const result = await sql`
        SELECT * FROM sidebar_items 
        ORDER BY parent_id NULLS FIRST, sort_order, name
      `
      return result as SidebarItem[]
    } catch (error: any) {
      if (error.message?.includes('relation "sidebar_items" does not exist')) {
        await this.initializeTables()
        const result = await sql`
          SELECT * FROM sidebar_items 
          ORDER BY parent_id NULLS FIRST, sort_order, name
        `
        return result as SidebarItem[]
      }
      throw error
    }
  }

  static async createSidebarItem(item: Omit<SidebarItem, "id" | "created_at" | "updated_at">): Promise<SidebarItem> {
    const result = await sql`
      INSERT INTO sidebar_items (name, parent_id, item_type, icon, sort_order)
      VALUES (${item.name}, ${item.parent_id}, ${item.item_type}, ${item.icon}, ${item.sort_order})
      RETURNING *
    `
    return result[0] as SidebarItem
  }

  static async updateSidebarItem(id: number, updates: Partial<SidebarItem>): Promise<SidebarItem> {
    const result = await sql`
      UPDATE sidebar_items 
      SET name = COALESCE(${updates.name}, name),
          parent_id = COALESCE(${updates.parent_id}, parent_id),
          item_type = COALESCE(${updates.item_type}, item_type),
          icon = COALESCE(${updates.icon}, icon),
          sort_order = COALESCE(${updates.sort_order}, sort_order),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return result[0] as SidebarItem
  }

  static async deleteSidebarItem(id: number): Promise<void> {
    await sql`DELETE FROM sidebar_items WHERE id = ${id}`
  }

  // Table operations
  static async getDynamicTable(id: number): Promise<DynamicTable | null> {
    const result = await sql`
      SELECT * FROM dynamic_tables WHERE id = ${id}
    `
    return (result[0] as DynamicTable) || null
  }

  static async getDynamicTableBySidebarId(sidebarId: number): Promise<DynamicTable | null> {
    const result = await sql`
      SELECT * FROM dynamic_tables WHERE sidebar_item_id = ${sidebarId}
    `
    return (result[0] as DynamicTable) || null
  }

  static async createDynamicTable(
    table: Omit<DynamicTable, "id" | "created_at" | "updated_at">,
  ): Promise<DynamicTable> {
    const result = await sql`
      INSERT INTO dynamic_tables (sidebar_item_id, table_name, display_name, description)
      VALUES (${table.sidebar_item_id}, ${table.table_name}, ${table.display_name}, ${table.description})
      RETURNING *
    `
    return result[0] as DynamicTable
  }

  // Column operations
  static async getTableColumns(tableId: number): Promise<TableColumn[]> {
    const result = await sql`
      SELECT * FROM table_columns 
      WHERE table_id = ${tableId}
      ORDER BY sort_order, column_name
    `
    return result as TableColumn[]
  }

  static async createTableColumn(column: Omit<TableColumn, "id" | "created_at" | "updated_at">): Promise<TableColumn> {
    const result = await sql`
      INSERT INTO table_columns (table_id, column_name, display_name, data_type, is_required, default_value, sort_order, width)
      VALUES (${column.table_id}, ${column.column_name}, ${column.display_name}, ${column.data_type}, ${column.is_required}, ${column.default_value}, ${column.sort_order}, ${column.width})
      RETURNING *
    `
    return result[0] as TableColumn
  }

  static async updateTableColumn(id: number, updates: Partial<TableColumn>): Promise<TableColumn> {
    const result = await sql`
      UPDATE table_columns 
      SET column_name = COALESCE(${updates.column_name}, column_name),
          display_name = COALESCE(${updates.display_name}, display_name),
          data_type = COALESCE(${updates.data_type}, data_type),
          is_required = COALESCE(${updates.is_required}, is_required),
          default_value = COALESCE(${updates.default_value}, default_value),
          sort_order = COALESCE(${updates.sort_order}, sort_order),
          width = COALESCE(${updates.width}, width),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return result[0] as TableColumn
  }

  static async deleteTableColumn(id: number): Promise<void> {
    await sql`DELETE FROM table_columns WHERE id = ${id}`
  }

  // Data operations
  static async getTableData(tableId: number, limit = 100, offset = 0): Promise<TableData[]> {
    const result = await sql`
      SELECT * FROM table_data 
      WHERE table_id = ${tableId}
      ORDER BY id
      LIMIT ${limit} OFFSET ${offset}
    `
    return result as TableData[]
  }

  static async createTableRow(tableId: number, rowData: Record<string, any>): Promise<TableData> {
    const result = await sql`
      INSERT INTO table_data (table_id, row_data)
      VALUES (${tableId}, ${JSON.stringify(rowData)})
      RETURNING *
    `
    return result[0] as TableData
  }

  static async updateTableRow(id: number, rowData: Record<string, any>): Promise<TableData> {
    const result = await sql`
      UPDATE table_data 
      SET row_data = ${JSON.stringify(rowData)},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return result[0] as TableData
  }

  static async deleteTableRow(id: number): Promise<void> {
    await sql`DELETE FROM table_data WHERE id = ${id}`
  }
}
