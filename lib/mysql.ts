import mysql from 'mysql2/promise';
import { config } from 'dotenv';

// Load environment variables
config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'dataexplorer',
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'dataexplorer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper function to execute SQL queries
export async function sql<T>(strings: TemplateStringsArray | string, ...values: any[]): Promise<T> {
  const connection = await pool.getConnection();
  try {
    let query: string;
    let params: any[];
    
    if (typeof strings === 'string') {
      // If first argument is a string, treat second argument as params array
      query = strings;
      params = values[0] || [];
    } else {
      // Build the query from template literals
      query = strings[0];
      params = [];
      
      for (let i = 0; i < values.length; i++) {
        if (values[i] !== undefined) {
          params.push(values[i]);
        }
        if (strings[i + 1]) {
          query += '?' + strings[i + 1];
        }
      }
    }

    console.log('Executing query:', { query, params });
    
    // Execute the query
    const [result] = await connection.execute(query, params);
    console.log('Query result:', result);
    
    // Handle different result types
    if (Array.isArray(result)) {
      console.log('Query returned array with length:', result.length);
      return result as T;
    } else if (result && typeof result === 'object') {
      console.log('Query returned object:', result);
      return [result] as T;
    } else {
      console.log('Query returned:', result);
      return result as T;
    }
  } catch (error) {
    console.error('SQL Error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Database types (keep the same as before)
export interface SidebarItem {
  id: number;
  name: string;
  parent_id: number | null;
  item_type: "folder" | "table";
  icon?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DynamicTable {
  id: number;
  sidebar_item_id: number;
  table_name: string;
  display_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TableColumn {
  id: number;
  table_id: number;
  column_name: string;
  display_name: string;
  data_type: "text" | "number" | "date" | "boolean" | "decimal" | "double" | "checkbox";
  is_required: boolean;
  default_value?: string;
  sort_order: number;
  width: number;
  created_at: string;
  updated_at: string;
}

export interface TableData {
  id: number;
  table_id: number;
  row_data: Record<string, any>;
  data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Database Service class with MySQL-compatible queries
export class DatabaseService {
  static async initializeTables(): Promise<void> {
    try {
      // Create sidebar_items table
      await sql`
        CREATE TABLE IF NOT EXISTS sidebar_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          parent_id INT,
          item_type ENUM('folder', 'table') NOT NULL,
          icon VARCHAR(50),
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES sidebar_items(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `;

      // Create dynamic_tables table
      await sql`
        CREATE TABLE IF NOT EXISTS dynamic_tables (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sidebar_item_id INT NOT NULL,
          table_name VARCHAR(255) NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (sidebar_item_id) REFERENCES sidebar_items(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `;

      // Create table_columns table
      await sql`
        CREATE TABLE IF NOT EXISTS table_columns (
          id INT AUTO_INCREMENT PRIMARY KEY,
          table_id INT NOT NULL,
          column_name VARCHAR(255) NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          data_type ENUM('text', 'number', 'date', 'boolean', 'decimal', 'double', 'checkbox') NOT NULL,
          is_required BOOLEAN DEFAULT FALSE,
          default_value TEXT,
          sort_order INT DEFAULT 0,
          width INT DEFAULT 150,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (table_id) REFERENCES dynamic_tables(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `;

      // Create table_data table with JSON column
      await sql`
        CREATE TABLE IF NOT EXISTS table_data (
          id INT AUTO_INCREMENT PRIMARY KEY,
          table_id INT NOT NULL,
          row_data JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (table_id) REFERENCES dynamic_tables(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `;

      // Check if we need to seed initial data
      const [{ count }] = await sql<[{ count: number }]>`
        SELECT COUNT(*) as count FROM sidebar_items
      `;
      
      if (count === 0) {
        await this.seedInitialData();
      }
    } catch (error) {
      console.error("Error initializing database tables:", error);
      throw error;
    }
  }

  static async seedInitialData(): Promise<void> {
    try {
      // Create root "Tables" folder
      const [tablesFolder] = await sql<SidebarItem[]>`
        INSERT INTO sidebar_items (name, parent_id, item_type, icon, sort_order)
        VALUES ('Tables', NULL, 'folder', 'folder', 0)
      `;

      // Create sample table sidebar item
      const [sampleTableItem] = await sql<SidebarItem[]>`
        INSERT INTO sidebar_items (name, parent_id, item_type, icon, sort_order)
        VALUES ('Sample Customers', ?, 'table', 'table', 0)
      `;

      // Create the dynamic table
      const [dynamicTable] = await sql<DynamicTable[]>`
        INSERT INTO dynamic_tables (sidebar_item_id, table_name, display_name, description)
        VALUES (?, 'sample_customers', 'Sample Customers', 'A sample customer table to get you started')
      `;

      // Create sample columns
      await sql`
        INSERT INTO table_columns 
        (table_id, column_name, display_name, data_type, is_required, sort_order, width)
        VALUES
        (?, 'name', 'Customer Name', 'text', true, 0, 200),
        (?, 'email', 'Email Address', 'text', true, 1, 250),
        (?, 'phone', 'Phone Number', 'text', false, 2, 150),
        (?, 'active', 'Active', 'checkbox', false, 3, 100),
        (?, 'created_date', 'Created Date', 'date', false, 4, 150)
      `;

      // Create sample data
      await sql`
        INSERT INTO table_data (table_id, row_data)
        VALUES
        (?, JSON_OBJECT(
          'name', 'John Doe',
          'email', 'john@example.com',
          'phone', '+1-555-0123',
          'active', true,
          'created_date', '2024-01-15'
        )),
        (?, JSON_OBJECT(
          'name', 'Jane Smith',
          'email', 'jane@example.com',
          'phone', '+1-555-0124',
          'active', true,
          'created_date', '2024-01-16'
        )),
        (?, JSON_OBJECT(
          'name', 'Bob Johnson',
          'email', 'bob@example.com',
          'phone', '+1-555-0125',
          'active', false,
          'created_date', '2024-01-17'
        ))
      `;
    } catch (error) {
      console.error("Error seeding initial data:", error);
      throw error;
    }
  }

  static async getSidebarItems(): Promise<SidebarItem[]> {
    try {
      return await sql<SidebarItem[]>`
        SELECT * FROM sidebar_items 
        ORDER BY parent_id IS NULL DESC, sort_order, name
      `;
    } catch (error: any) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        await this.initializeTables();
        return await sql<SidebarItem[]>`
          SELECT * FROM sidebar_items 
          ORDER BY parent_id IS NULL DESC, sort_order, name
        `;
      }
      throw error;
    }
  }

  static async createSidebarItem(item: Omit<SidebarItem, "id" | "created_at" | "updated_at">): Promise<SidebarItem> {
    console.log('Creating sidebar item with:', item); // Add logging
    
    // Validate input
    if (!item.name || !item.item_type) {
      throw new Error('Name and item_type are required');
    }

    const result = await sql<SidebarItem[]>(
      'INSERT INTO sidebar_items (name, parent_id, item_type, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
      [
        item.name,
        item.parent_id === null ? null : item.parent_id,
        item.item_type,
        item.icon || null,
        item.sort_order || 0
      ]
    );

    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error('Failed to create sidebar item - no result returned');
    }

    const [createdItem] = await sql<SidebarItem[]>(
      'SELECT * FROM sidebar_items WHERE id = LAST_INSERT_ID()',
      []
    );
    
    if (!createdItem) {
      throw new Error('Failed to retrieve created sidebar item');
    }
    
    return createdItem;
  }

  static async updateSidebarItem(id: number, updates: Partial<SidebarItem>): Promise<SidebarItem> {
    try {
      console.log('Updating sidebar item:', { id, updates });
      
      // First verify item exists
      const rows = await sql<SidebarItem[]>(
        'SELECT * FROM sidebar_items WHERE id = ?',
        [id]
      );

      const existingItem = rows?.[0];
      if (!existingItem) {
        throw new Error('Item not found');
      }

      if (!updates.name) {
        throw new Error('Name is required for update');
      }

      // Update only the name field
      const result = await sql<{ affectedRows: number }>(
        'UPDATE sidebar_items SET name = ? WHERE id = ?',
        [updates.name, id]
      );

      if (!result || result.affectedRows === 0) {
        throw new Error('Update failed');
      }

      // Get the updated item
      const updatedRows = await sql<SidebarItem[]>(
        'SELECT * FROM sidebar_items WHERE id = ?',
        [id]
      );

      const updatedItem = updatedRows?.[0];
      if (!updatedItem) {
        throw new Error('Failed to retrieve updated item');
      }

      console.log('Update successful:', updatedItem);
      return updatedItem;
    } catch (error) {
      console.error('Error in updateSidebarItem:', error);
      throw error;
    }
  }

  static async deleteSidebarItem(id: number): Promise<void> {
    await sql(
      'DELETE FROM sidebar_items WHERE id = ?',
      [id]
    );
  }

  // Table operations
  static async getDynamicTable(id: number): Promise<DynamicTable | null> {
    const [result] = await sql<DynamicTable[]>`
      SELECT * FROM dynamic_tables WHERE id = ?
    `;
    return result || null;
  }

  static async getDynamicTableBySidebarId(sidebarId: number): Promise<DynamicTable | null> {
    console.log('Getting dynamic table for sidebar ID:', sidebarId); // Add logging
    
    const result = await sql<DynamicTable[]>(
      'SELECT * FROM dynamic_tables WHERE sidebar_item_id = ?',
      [sidebarId]
    );

    if (!result || !Array.isArray(result)) {
      console.log('No dynamic table found for sidebar ID:', sidebarId);
      return null;
    }

    const [table] = result;
    return table || null;
  }

  static async createDynamicTable(
    table: Omit<DynamicTable, "id" | "created_at" | "updated_at">,
  ): Promise<DynamicTable> {
    console.log('Creating dynamic table with:', table); // Add logging

    // Validate required fields
    if (!table.sidebar_item_id || !table.table_name || !table.display_name) {
      throw new Error('Missing required fields for creating dynamic table');
    }

    const result = await sql<DynamicTable[]>(
      'INSERT INTO dynamic_tables (sidebar_item_id, table_name, display_name, description) VALUES (?, ?, ?, ?)',
      [table.sidebar_item_id, table.table_name, table.display_name, table.description || null]
    );

    if (!result || !Array.isArray(result)) {
      throw new Error('Failed to create dynamic table - no result returned');
    }

    // Fetch the created table
    const [createdTable] = await sql<DynamicTable[]>(
      'SELECT * FROM dynamic_tables WHERE id = LAST_INSERT_ID()',
      []
    );

    if (!createdTable) {
      throw new Error('Failed to retrieve created dynamic table');
    }

    return createdTable;
  }

  // Column operations
  static async getTableColumns(tableId: number): Promise<TableColumn[]> {
    return await sql<TableColumn[]>`
      SELECT * FROM table_columns 
      WHERE table_id = ?
      ORDER BY sort_order, column_name
    `;
  }

  static async createTableColumn(column: Omit<TableColumn, "id" | "created_at" | "updated_at">): Promise<TableColumn> {
    console.log('Creating table column with:', column); // Add logging

    // Validate required fields
    if (!column.table_id || !column.column_name || !column.display_name || !column.data_type) {
      throw new Error('Missing required fields for creating column');
    }

    const result = await sql<TableColumn[]>(
      'INSERT INTO table_columns (table_id, column_name, display_name, data_type, is_required, default_value, sort_order, width) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        column.table_id,
        column.column_name,
        column.display_name,
        column.data_type,
        column.is_required || false,
        column.default_value || null,
        column.sort_order || 0,
        column.width || 150
      ]
    );

    if (!result || !Array.isArray(result)) {
      throw new Error('Failed to create column - no result returned');
    }

    // Fetch the created column
    const [createdColumn] = await sql<TableColumn[]>(
      'SELECT * FROM table_columns WHERE id = LAST_INSERT_ID()',
      []
    );

    if (!createdColumn) {
      throw new Error('Failed to retrieve created column');
    }

    return createdColumn;
  }

  static async updateTableColumn(id: number, updates: Partial<TableColumn>): Promise<TableColumn> {
    const [result] = await sql<TableColumn[]>`
      UPDATE table_columns 
      SET 
        column_name = COALESCE(?, column_name),
        display_name = COALESCE(?, display_name),
        data_type = COALESCE(?, data_type),
        is_required = COALESCE(?, is_required),
        default_value = COALESCE(?, default_value),
        sort_order = COALESCE(?, sort_order),
        width = COALESCE(?, width)
      WHERE id = ?
    `;
    return result;
  }

  static async deleteTableColumn(id: number): Promise<void> {
    await sql`DELETE FROM table_columns WHERE id = ?`;
  }

  // Data operations
  static async getTableData(tableId: number, limit = 100, offset = 0): Promise<TableData[]> {
    const result = await sql<TableData[]>(
      'SELECT *, row_data as data FROM table_data WHERE table_id = ? ORDER BY id LIMIT ? OFFSET ?',
      [tableId, limit, offset]
    );
    
    // Ensure data is properly parsed from JSON
    return result.map(row => ({
      ...row,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
    }));
  }

  static async createTableRow(tableId: number, rowData: Record<string, any>): Promise<TableData> {
    // Convert the data to a JSON string for MySQL
    const jsonData = JSON.stringify(rowData);
    
    const result = await sql<TableData[]>(
      'INSERT INTO table_data (table_id, row_data) VALUES (?, ?)',
      [tableId, jsonData]
    );

    if (!result || !result[0]) {
      throw new Error('Failed to create row');
    }

    // Fetch the newly created row to return
    const [newRow] = await sql<TableData[]>(
      'SELECT *, row_data as data FROM table_data WHERE id = LAST_INSERT_ID()',
      []
    );

    return {
      ...newRow,
      data: typeof newRow.row_data === 'string' ? JSON.parse(newRow.row_data) : newRow.row_data
    };
  }

  static async updateTableRow(id: number, rowData: Record<string, any>): Promise<TableData> {
    // Convert the data to a JSON string for MySQL
    const jsonData = JSON.stringify(rowData);
    
    const result = await sql<TableData[]>(
      'UPDATE table_data SET row_data = ? WHERE id = ?',
      [jsonData, id]
    );

    // Fetch the updated row to return
    const [updatedRow] = await sql<TableData[]>(
      'SELECT *, row_data as data FROM table_data WHERE id = ?',
      [id]
    );

    if (!updatedRow) {
      throw new Error('Failed to update row');
    }

    return {
      ...updatedRow,
      data: typeof updatedRow.row_data === 'string' ? JSON.parse(updatedRow.row_data) : updatedRow.row_data
    };
  }

  static async deleteTableRow(id: number): Promise<void> {
    await sql`DELETE FROM table_data WHERE id = ?`;
  }
}
