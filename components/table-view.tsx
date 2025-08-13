"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { toast } from "@/hooks/use-toast"
import { Plus, Settings, Trash2 } from "lucide-react"

import { ColumnDefinition } from 'tabulator-tables'

interface TableViewProps {
  itemId: number
  itemName: string
}

interface Column {
  id: number
  column_name: string
  display_name: string
  data_type: string
  is_required: boolean
  default_value?: string
  sort_order: number
  width: number
}

interface TableData {
  id: number
  data: Record<string, any>
}

// Extended Tabulator column definition
interface TabulatorColumnDefinition extends ColumnDefinition {
  headerContextMenu?: { label: string; action: () => void }[]
  cellEdited?: (cell: any) => void
}

export function TableView({ itemId, itemName }: TableViewProps) {
  const [columns, setColumns] = useState<Column[]>([])
  const [tableData, setTableData] = useState<TableData[]>([])
  const [loading, setLoading] = useState(true)
  const [showColumnDialog, setShowColumnDialog] = useState(false)
  const [editingColumn, setEditingColumn] = useState<Column | null>(null)
  const [newColumn, setNewColumn] = useState({
    name: "",
    data_type: "text",
    is_required: false,
    default_value: "",
  })
  const tabulatorRef = useRef<any>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // Load Tabulator dynamically
  useEffect(() => {
    const loadTabulator = async () => {
      if (typeof window !== "undefined") {
        try {
          // Load Tabulator CSS
          const link = document.createElement("link")
          link.rel = "stylesheet"
          link.href = "https://unpkg.com/tabulator-tables@6.2.1/dist/css/tabulator.min.css"
          document.head.appendChild(link)

          // Load Tabulator JS
          const { TabulatorFull } = await import("tabulator-tables")
          // Type assertion for Tabulator
          window.Tabulator = TabulatorFull as typeof window.Tabulator
        } catch (error) {
          console.error("Error loading Tabulator:", error)
        }
      }
    }
    loadTabulator()
  }, [])

  // Load table data and columns
  useEffect(() => {
    loadTableData()
  }, [itemId])

  // Initialize Tabulator when data is loaded
  useEffect(() => {
    if (columns.length > 0 && window.Tabulator && tableRef.current) {
      initializeTabulator()
    }
  }, [columns, tableData])

  const loadTableData = async () => {
    try {
      setLoading(true)

      // Load columns
      const columnsResponse = await fetch(`/api/tables/${itemId}/columns`)
      if (columnsResponse.ok) {
        const columnsData = await columnsResponse.json()
        setColumns(columnsData)
      }

      // Load table data
      const dataResponse = await fetch(`/api/tables/${itemId}/data`)
      if (dataResponse.ok) {
        const data = await dataResponse.json()
        setTableData(data)
      }
    } catch (error) {
      console.error("Error loading table data:", error)
      toast({
        title: "Error",
        description: "Failed to load table data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const initializeTabulator = () => {
    if (!window.Tabulator || !tableRef.current) {
      console.warn('Tabulator or table ref not available yet');
      return;
    }

    console.log('Initializing Tabulator with columns:', columns);
    console.log('Table data:', tableData);

    // Destroy existing table
    if (tabulatorRef.current) {
      tabulatorRef.current.destroy()
    }

    // Added right-click context menu to column headers and fixed field mapping
    const tabulatorColumns: TabulatorColumnDefinition[] = columns.map((col) => ({
      title: col.display_name || col.column_name, // Use display_name if available, fallback to column_name
      field: `data.${(col.column_name || '').toLowerCase().replace(/\s+/g, '_')}`, // Access data from the nested data object with normalized field name
      editor: true,
      editorParams: { type: getEditorForType(col.data_type) },
      formatter: getFormatterForType(col.data_type),
      sorter: col.data_type === "number" ? "number" : "string",
      headerSort: true,
      headerContextMenu: [
        {
          label: "Edit Column",
          action: () => openColumnDialog(col),
        },
        {
          label: "Delete Column",
          action: () => handleDeleteColumn(col.id),
        },
      ],
      cellEdited: async (cell: any) => {
        try {
          const row = cell.getRow();
          const rowData = row.getData();
          const field = cell.getField();
          const value = cell.getValue();
          
          console.log('Cell edited:', {
            field,
            value,
            rowData
          });

          // Get the original column name from the field path
          const fieldName = field.replace('data.', '');
          
          // Find the matching column to get the correct column name
          const column = columns.find(col => 
            col.column_name.toLowerCase().replace(/\s+/g, '_') === fieldName
          );

          if (!column) {
            console.error('Could not find matching column for field:', fieldName);
            throw new Error('Invalid column');
          }

          // Get the current row data and update just the changed field
          const currentData = rowData.data || {};
          const updateData = {
            ...currentData,
            [column.column_name]: value
          };

          console.log('Sending update with data:', updateData);
          
          await updateRowData(rowData.id, { data: updateData });
        } catch (error) {
          console.error('Error handling cell edit:', error);
          // Revert the cell to its previous value on error
          cell.restoreOldValue();
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to update cell",
            variant: "destructive",
          });
        }
      },
      resizable: true,
      minWidth: 100
    } as TabulatorColumnDefinition))

    // Add action column
    tabulatorColumns.push({
      title: "",
      field: "actions",
      width: 50,
      headerSort: false,
      formatter: () =>
        `<button class="delete-row-btn text-red-500 hover:text-red-700 p-1 rounded">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>`,
      cellClick: (e: any, cell: any) => {
        const deleteBtn = e.target.closest(".delete-row-btn");
        if (deleteBtn) {
          if (confirm('Are you sure you want to delete this row?')) {
            deleteRow(cell.getRow().getData().id);
          }
        }
      },
      headerHozAlign: "center",
      hozAlign: "center",
    })

    // Use the data directly from the row, maintaining the nested structure
    const data = tableData.map((row) => ({
      id: row.id,
      data: row.data || {} // Ensure we have a data object
    }))

    // Initialize Tabulator
    try {
      console.log('Creating Tabulator with:', { data, columns: tabulatorColumns });
      tabulatorRef.current = new window.Tabulator(tableRef.current, {
        data: data,
        columns: tabulatorColumns as any[],
        layout: "fitColumns",
        movableColumns: true,
        height: "100%",
        history: true
      });
    } catch (error) {
      console.error('Error initializing Tabulator:', error);
    }
  }

  const getEditorForType = (dataType: string) => {
    switch (dataType) {
      case "number":
      case "decimal":
      case "double":
        return "number"
      case "date":
        return "date"
      case "boolean":
        return "tickCross"
      case "checkbox":
        return "tickCross"
      default:
        return "input"
    }
  }

  const getFormatterForType = (dataType: string) => {
    switch (dataType) {
      case "boolean":
      case "checkbox":
        return "tickCross"
      case "date":
        return "datetime"
      case "decimal":
      case "double":
        return (cell: any) => Number.parseFloat(cell.getValue()).toFixed(2)
      default:
        return undefined
    }
  }

  const updateRowData = async (rowId: number, data: any) => {
    try {
      console.log('Updating row data:', { rowId, data });
      
      // Normalize incoming data
      const rowData = data.data || data; // Handle both nested and direct data
      const originalData: any = {};
      
      columns.forEach((col) => {
        const fieldName = col.column_name.toLowerCase().replace(/\s+/g, "_");
        const value = rowData[fieldName];
        
        // Only include defined values, including explicit null/false values
        if (value !== undefined) {
          originalData[col.column_name] = value;
        }
      });

      console.log('Processed data to send:', originalData);

      const response = await fetch(`/api/tables/${itemId}/data/${rowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: originalData }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Update failed:', result);
        throw new Error(result.error || "Failed to update row");
      }

      console.log('Update successful:', result);

      toast({
        title: "Success",
        description: "Row updated successfully",
      });
      
      return result;
    } catch (error) {
      console.error("Error updating row:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update row",
        variant: "destructive",
      });
      // Revert the change in Tabulator
      loadTableData();
    }
  }

  const deleteRow = async (rowId: number) => {
    try {
      const response = await fetch(`/api/tables/${itemId}/data/${rowId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete row")
      }

      // Remove from Tabulator
      const row = tabulatorRef.current.getRow(rowId)
      row.delete()

      toast({
        title: "Success",
        description: "Row deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting row:", error)
      toast({
        title: "Error",
        description: "Failed to delete row",
        variant: "destructive",
      })
    }
  }

  const addNewRow = async () => {
    if (!tabulatorRef.current) return

    try {
      // First get the dynamic table ID
      const tableResponse = await fetch(`/api/tables/${itemId}`);
      const tableData = await tableResponse.json();
      
      if (!tableData || tableData.error === "Table not found") {
        throw new Error("Table not found. Please create columns first.");
      }

      console.log('Found table:', tableData);

      // Prepare default data
      const rowData: any = {}
      columns.forEach((col) => {
        const fieldName = col.column_name;
        rowData[fieldName] = getDefaultValueForType(col.data_type, col.default_value)
      })

      console.log('Creating new row with data:', rowData);

      // Save to database with the correct table ID
      const response = await fetch(`/api/tables/${itemId}/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: tableData.id,
          data: rowData
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to create row:', error);
        throw new Error(error.error || "Failed to create row");
      }

      const newRow = await response.json();
      console.log('Row created successfully:', newRow);

      // Then add to Tabulator with the correct structure
      const tabulatorData = {
        id: newRow.id,
        data: rowData
      };

      tabulatorRef.current.addRow(tabulatorData, true);

      toast({
        title: "Success",
        description: "Row created successfully",
      });
    } catch (error) {
      console.error("Error creating row:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create row",
        variant: "destructive",
      });
    }
  }

  const getDefaultValueForType = (dataType: string, defaultValue?: string) => {
    if (defaultValue) return defaultValue

    switch (dataType) {
      case "number":
      case "decimal":
      case "double":
        return 0
      case "boolean":
      case "checkbox":
        return false
      case "date":
        return new Date().toISOString().split("T")[0]
      default:
        return ""
    }
  }

  const handleCreateColumn = async () => {
    try {
      // Validate column name
      if (!newColumn.name.trim()) {
        toast({
          title: "Error",
          description: "Column name is required",
          variant: "destructive",
        });
        return;
      }

      // Clean column name
      const columnName = newColumn.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      // First check if we need to create a dynamic table
      const tableResponse = await fetch(`/api/tables/${itemId}`);
      const tableData = await tableResponse.json();

      if (!tableData || tableData.error === "Table not found") {
        // Create dynamic table first
        const createTableResponse = await fetch(`/api/tables/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sidebar_item_id: itemId,
            table_name: itemName.toLowerCase().replace(/\s+/g, '_'),
            display_name: itemName,
            description: `Table for ${itemName}`
          }),
        });

        if (!createTableResponse.ok) {
          const error = await createTableResponse.json();
          throw new Error(error.error || "Failed to create table");
        }
      }

      // Now create the column
      const response = await fetch(`/api/tables/${itemId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: columnName,
          display_name: newColumn.name.trim(),
          data_type: newColumn.data_type,
          is_required: newColumn.is_required,
          default_value: newColumn.default_value?.trim() || null,
          sort_order: columns.length,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create column");
      }

      setNewColumn({ name: "", data_type: "text", is_required: false, default_value: "" });
      setShowColumnDialog(false);
      
      // Reload table data
      await loadTableData();

      toast({
        title: "Success",
        description: "Column created successfully",
      });
    } catch (error) {
      console.error("Error creating column:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create column",
        variant: "destructive",
      });
    }
  }

  const handleEditColumn = async () => {
    if (!editingColumn) return

    try {
      console.log('Updating column:', { editingColumn, newColumn });

      // Clean column name
      const columnName = newColumn.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      const updateData = {
        column_name: columnName,
        display_name: newColumn.name.trim(),
        data_type: newColumn.data_type,
        is_required: newColumn.is_required,
        default_value: newColumn.default_value?.trim() || null
      };

      console.log('Sending update data:', updateData);

      const response = await fetch(`/api/tables/${itemId}/columns/${editingColumn.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to update column:', error);
        throw new Error(error.error || "Failed to update column");
      }

      const updatedColumn = await response.json();
      console.log('Column updated successfully:', updatedColumn);

      setEditingColumn(null);
      setNewColumn({ name: "", data_type: "text", is_required: false, default_value: "" });
      setShowColumnDialog(false);
      await loadTableData(); // Reload to refresh Tabulator

      toast({
        title: "Success",
        description: "Column updated successfully",
      });
    } catch (error) {
      console.error("Error updating column:", error)
      toast({
        title: "Error",
        description: "Failed to update column",
        variant: "destructive",
      })
    }
  }

  const handleDeleteColumn = async (columnId: number) => {
    try {
      const response = await fetch(`/api/tables/${itemId}/columns/${columnId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete column")
      }

      loadTableData() // Reload to refresh Tabulator

      toast({
        title: "Success",
        description: "Column deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting column:", error)
      toast({
        title: "Error",
        description: "Failed to delete column",
        variant: "destructive",
      })
    }
  }

  const openColumnDialog = (column?: Column) => {
    if (column) {
      setEditingColumn(column)
      setNewColumn({
        name: column.column_name,
        data_type: column.data_type,
        is_required: column.is_required,
        default_value: column.default_value || "",
      })
    } else {
      setEditingColumn(null)
      setNewColumn({ name: "", data_type: "text", is_required: false, default_value: "" })
    }
    setShowColumnDialog(true)
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4">
          <h1 className="text-2xl font-semibold">{itemName}</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading table...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <ContextMenu>
            <ContextMenuTrigger>
              <h1 className="text-2xl font-semibold cursor-pointer hover:text-primary">{itemName}</h1>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => openColumnDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Column
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setShowColumnDialog(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Manage Columns
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          <div className="flex gap-2">
            <Button onClick={addNewRow} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Row
            </Button>
            <Button onClick={() => openColumnDialog()} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Column
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground mt-1">
          Right-click table name or column headers for management • Press Enter to save cell changes
        </p>
      </div>

      <div className="flex-1 p-4">
        {columns.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="mb-4">No columns defined for this table</p>
            <Button onClick={() => openColumnDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Column
            </Button>
          </div>
        ) : (
          <div ref={tableRef} className="w-full h-full"></div>
        )}
      </div>

      <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingColumn ? "Edit Column" : "Add New Column"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="columnName">Column Name</Label>
              <Input
                id="columnName"
                value={newColumn.name}
                onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                placeholder="Enter column name"
              />
            </div>

            <div>
              <Label htmlFor="dataType">Data Type</Label>
              <Select
                value={newColumn.data_type}
                onValueChange={(value) => setNewColumn({ ...newColumn, data_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="decimal">Decimal</SelectItem>
                  <SelectItem value="double">Double</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="defaultValue">Default Value (Optional)</Label>
              <Input
                id="defaultValue"
                value={newColumn.default_value}
                onChange={(e) => setNewColumn({ ...newColumn, default_value: e.target.value })}
                placeholder="Enter default value"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isRequired"
                checked={newColumn.is_required}
                onChange={(e) => setNewColumn({ ...newColumn, is_required: e.target.checked })}
              />
              <Label htmlFor="isRequired">Required Field</Label>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <div>
              {editingColumn && (
                <Button variant="destructive" onClick={() => handleDeleteColumn(editingColumn.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Column
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowColumnDialog(false)}>
                Cancel
              </Button>
              <Button onClick={editingColumn ? handleEditColumn : handleCreateColumn}>
                {editingColumn ? "Update" : "Create"} Column
              </Button>
            </div>
          </div>

          {!editingColumn && columns.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Existing Columns</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {columns.map((column) => (
                  <div key={column.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{column.display_name || column.column_name}</span>
                      <span className="text-sm text-muted-foreground ml-2">({column.data_type})</span>
                      {column.is_required && <span className="text-xs text-red-500 ml-2">Required</span>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openColumnDialog(column)}>
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
