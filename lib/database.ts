import { sql } from './mysql';

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
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          parent_id INT,
          item_type ENUM('folder', 'table') NOT NULL,
          icon VARCHAR(50),
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES sidebar_items(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `

      // Create dynamic_tables table
      await sql`
        CREATE TABLE IF NOT EXISTS dynamic_tables (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sidebar_item_id INT NOT NULL UNIQUE,
          table_name VARCHAR(255) NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (sidebar_item_id) REFERENCES sidebar_items(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `

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
        ) ENGINE=InnoDB
      `

      // Create table_data table
      await sql`
        CREATE TABLE IF NOT EXISTS table_data (
          id INT AUTO_INCREMENT PRIMARY KEY,
          table_id INT NOT NULL,
          row_data JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (table_id) REFERENCES dynamic_tables(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `

      // Check if we need to seed initial data
      const [result] = await sql<[{ count: number }]>`
        SELECT COUNT(*) as count FROM sidebar_items
      `;
      if (result.count === 0) {
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
      await sql`
        INSERT INTO sidebar_items (name, parent_id, item_type, icon, sort_order)
        VALUES ('Tables', NULL, 'folder', 'folder', 0)
      `;
      
      const [tablesFolder] = await sql<SidebarItem[]>`
        SELECT * FROM sidebar_items WHERE id = LAST_INSERT_ID()
      `;

      if (!tablesFolder) {
        throw new Error('Failed to create root folder');
      }

      // Create sample table sidebar item
      await sql`
        INSERT INTO sidebar_items (name, parent_id, item_type, icon, sort_order)
        VALUES ('Sample Customers', ${tablesFolder.id}, 'table', 'table', 0)
      `;

      const [sampleTableItem] = await sql<SidebarItem[]>`
        SELECT * FROM sidebar_items WHERE id = LAST_INSERT_ID()
      `;

      if (!sampleTableItem) {
        throw new Error('Failed to create sample table item');
      }

      // Create the dynamic table
      await sql`
        INSERT INTO dynamic_tables (sidebar_item_id, table_name, display_name, description)
        VALUES (${sampleTableItem.id}, 'sample_customers', 'Sample Customers', 'A sample customer table to get you started')
      `;

      const [dynamicTable] = await sql<DynamicTable[]>`
        SELECT * FROM dynamic_tables WHERE id = LAST_INSERT_ID()
      `;

      if (!dynamicTable) {
        throw new Error('Failed to create dynamic table');
      }

      // Create sample columns
      await sql`
        INSERT INTO table_columns (table_id, column_name, display_name, data_type, is_required, sort_order, width)
        VALUES 
        (${dynamicTable.id}, 'name', 'Customer Name', 'text', true, 0, 200),
        (${dynamicTable.id}, 'email', 'Email Address', 'text', true, 1, 250),
        (${dynamicTable.id}, 'phone', 'Phone Number', 'text', false, 2, 150),
        (${dynamicTable.id}, 'active', 'Active', 'checkbox', false, 3, 100),
        (${dynamicTable.id}, 'created_date', 'Created Date', 'date', false, 4, 150)
      `;

      // Create sample data
      await sql`
        INSERT INTO table_data (table_id, row_data)
        VALUES
        (${dynamicTable.id}, ${JSON.stringify({
          name: "John Doe",
          email: "john@example.com",
          phone: "+1-555-0123",
          active: true,
          created_date: "2024-01-15"
        })}),
        (${dynamicTable.id}, ${JSON.stringify({
          name: "Jane Smith",
          email: "jane@example.com",
          phone: "+1-555-0124",
          active: true,
          created_date: "2024-01-16"
        })}),
        (${dynamicTable.id}, ${JSON.stringify({
          name: "Bob Johnson",
          email: "bob@example.com",
          phone: "+1-555-0125",
          active: false,
          created_date: "2024-01-17"
        })})
      `;
    } catch (error) {
      console.error("Error seeding initial data:", error)
      throw error
    }
  }

  static async getSidebarItems(): Promise<SidebarItem[]> {
    try {
      return await sql<SidebarItem[]>`
        SELECT * FROM sidebar_items 
        ORDER BY ISNULL(parent_id) DESC, sort_order, name
      `;
    } catch (error: any) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        await this.initializeTables();
        return await sql<SidebarItem[]>`
          SELECT * FROM sidebar_items 
          ORDER BY ISNULL(parent_id) DESC, sort_order, name
        `;
      }
      throw error;
    }
  }

  static async createSidebarItem(item: Omit<SidebarItem, "id" | "created_at" | "updated_at">): Promise<SidebarItem> {
    await sql`
      INSERT INTO sidebar_items (name, parent_id, item_type, icon, sort_order)
      VALUES (${item.name}, ${item.parent_id}, ${item.item_type}, ${item.icon}, ${item.sort_order})
    `;
    
    const [result] = await sql<SidebarItem[]>`
      SELECT * FROM sidebar_items WHERE id = LAST_INSERT_ID()
    `;
    
    if (!result) {
      throw new Error('Failed to create sidebar item');
    }
    
    return result;
  }

  static async updateSidebarItem(id: number, updates: Partial<SidebarItem>): Promise<SidebarItem> {
    // Build the SET clause dynamically based on provided updates
    const updateParts = [];
    const values = [];
    
    if (updates.name !== undefined) {
      updateParts.push('name = ?');
      values.push(updates.name);
    }
    if (updates.parent_id !== undefined) {
      updateParts.push('parent_id = ?');
      values.push(updates.parent_id);
    }
    if (updates.item_type !== undefined) {
      updateParts.push('item_type = ?');
      values.push(updates.item_type);
    }
    if (updates.icon !== undefined) {
      updateParts.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.sort_order !== undefined) {
      updateParts.push('sort_order = ?');
      values.push(updates.sort_order);
    }

    // Add the ID to the values array
    values.push(id);

    // Execute the update query
    await sql(
      `UPDATE sidebar_items SET ${updateParts.join(', ')} WHERE id = ?`,
      values
    );

    const [result] = await sql<SidebarItem[]>`
      SELECT * FROM sidebar_items WHERE id = ${id}
    `;

    if (!result) {
      throw new Error('Failed to update sidebar item');
    }

    return result;
  }

  static async deleteSidebarItem(id: number): Promise<void> {
    try {
      console.log('Attempting to delete item:', id);
      
      // First check if the item exists and get its type
      const [item] = await sql<SidebarItem[]>(
        'SELECT * FROM sidebar_items WHERE id = ?',
        [id]
      );

      if (!item) {
        throw new Error("Sidebar item not found");
      }

      // If it's a folder, delete its contents first
      if (item.item_type === 'folder') {
        // Get all tables under this folder
        const tablesToDelete = await sql<{ id: number }[]>(
          'SELECT id FROM sidebar_items WHERE parent_id = ? AND item_type = ?',
          [id, 'table']
        );

        if (tablesToDelete.length > 0) {
          const tableIds = tablesToDelete.map(t => t.id);
          // Delete associated dynamic tables
          await sql(
            'DELETE FROM dynamic_tables WHERE sidebar_item_id IN (' + tableIds.map(() => '?').join(',') + ')',
            tableIds
          );
        }

        // The foreign key cascade will handle the rest
        await sql(
          'DELETE FROM sidebar_items WHERE parent_id = ?',
          [id]
        );
      } else if (item.item_type === 'table') {
        // For tables, just delete the dynamic table (cascade will handle the rest)
        await sql(
          'DELETE FROM dynamic_tables WHERE sidebar_item_id = ?',
          [id]
        );
      }

      // Finally delete the item itself
      await sql(
        'DELETE FROM sidebar_items WHERE id = ?',
        [id]
      );

      console.log('Item deleted successfully:', item);
    } catch (error) {
      console.error("Error in deleteSidebarItem:", error);
      throw error;
    }
  }

  // Table operations
  static async getDynamicTable(id: number): Promise<DynamicTable | null> {
    const [result] = await sql<DynamicTable[]>`
      SELECT * FROM dynamic_tables WHERE id = ${id}
    `;
    return result || null;
  }

  static async getDynamicTableBySidebarId(sidebarId: number): Promise<DynamicTable | null> {
    const [result] = await sql<DynamicTable[]>`
      SELECT * FROM dynamic_tables WHERE sidebar_item_id = ${sidebarId}
    `;
    return result || null;
  }

  static async createDynamicTable(
    table: Omit<DynamicTable, "id" | "created_at" | "updated_at">,
  ): Promise<DynamicTable> {
    await sql`
      INSERT INTO dynamic_tables (sidebar_item_id, table_name, display_name, description)
      VALUES (${table.sidebar_item_id}, ${table.table_name}, ${table.display_name}, ${table.description})
    `;

    const [result] = await sql<DynamicTable[]>`
      SELECT * FROM dynamic_tables WHERE id = LAST_INSERT_ID()
    `;

    if (!result) {
      throw new Error('Failed to create dynamic table');
    }

    return result;
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
    await sql`
      INSERT INTO table_columns (table_id, column_name, display_name, data_type, is_required, default_value, sort_order, width)
      VALUES (${column.table_id}, ${column.column_name}, ${column.display_name}, ${column.data_type}, 
              ${column.is_required}, ${column.default_value}, ${column.sort_order}, ${column.width})
    `;

    const [result] = await sql<TableColumn[]>`
      SELECT * FROM table_columns WHERE id = LAST_INSERT_ID()
    `;

    if (!result) {
      throw new Error('Failed to create table column');
    }

    return result;
  }

  static async updateTableColumn(id: number, updates: Partial<TableColumn>): Promise<TableColumn> {
    try {
      console.log('Updating column:', { id, updates });

      // Build update query dynamically
      const updateFields = [];
      const values = [];
      
      if (updates.column_name !== undefined) {
        updateFields.push('column_name = ?');
        values.push(updates.column_name);
      }
      if (updates.display_name !== undefined) {
        updateFields.push('display_name = ?');
        values.push(updates.display_name);
      }
      if (updates.data_type !== undefined) {
        updateFields.push('data_type = ?');
        values.push(updates.data_type);
      }
      if (updates.is_required !== undefined) {
        updateFields.push('is_required = ?');
        values.push(updates.is_required);
      }
      if (updates.default_value !== undefined) {
        updateFields.push('default_value = ?');
        values.push(updates.default_value);
      }
      if (updates.sort_order !== undefined) {
        updateFields.push('sort_order = ?');
        values.push(updates.sort_order);
      }
      if (updates.width !== undefined) {
        updateFields.push('width = ?');
        values.push(updates.width);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Add id to values
      values.push(id);

      // Execute update
      await sql(
        `UPDATE table_columns SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );

      // Get updated column
      const [result] = await sql<TableColumn[]>`
        SELECT * FROM table_columns WHERE id = ${id}
      `;

      if (!result) {
        throw new Error('Column not found after update');
      }

      console.log('Column updated successfully:', result);
      return result;
    } catch (error) {
      console.error('Error updating column:', error);
      throw error;
    }

    const [result] = await sql<TableColumn[]>`
      SELECT * FROM table_columns WHERE id = ${id}
    `;

    if (!result) {
      throw new Error('Failed to update table column');
    }

    return result;
  }

  static async deleteTableColumn(id: number): Promise<void> {
    await sql`DELETE FROM table_columns WHERE id = ${id}`;
  }

  // Data operations
  static async getTableData(tableId: number, limit = 100, offset = 0): Promise<TableData[]> {
    return await sql<TableData[]>`
      SELECT * FROM table_data 
      WHERE table_id = ${tableId}
      ORDER BY id
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  static async createTableRow(tableId: number, rowData: Record<string, any>): Promise<TableData> {
    try {
      console.log('Creating table row:', { tableId, rowData });

      // Validate table exists
      const [table] = await sql<[{ count: number }]>`
        SELECT COUNT(*) as count FROM dynamic_tables WHERE id = ${tableId}
      `;

      if (!table || table.count === 0) {
        throw new Error(`Table with ID ${tableId} not found`);
      }

      // Insert the row
      await sql`
        INSERT INTO table_data (table_id, row_data)
        VALUES (${tableId}, ${JSON.stringify(rowData)})
      `;

      // Get the created row
      const [result] = await sql<TableData[]>`
        SELECT * FROM table_data WHERE id = LAST_INSERT_ID()
      `;

      if (!result) {
        throw new Error('Failed to create table row');
      }

      console.log('Created row:', result);
      return result;
    } catch (error) {
      console.error('Error in createTableRow:', error);
      throw error;
    }
  }

  static async updateTableRow(id: number, rowData: Record<string, any>): Promise<TableData> {
    await sql`
      UPDATE table_data 
      SET row_data = ${JSON.stringify(rowData)}
      WHERE id = ${id}
    `;

    const [result] = await sql<TableData[]>`
      SELECT * FROM table_data WHERE id = ${id}
    `;

    if (!result) {
      throw new Error('Failed to update table row');
    }

    return result;
  }

  static async deleteTableRow(id: number): Promise<void> {
    await sql`DELETE FROM table_data WHERE id = ${id}`;
  }
}
