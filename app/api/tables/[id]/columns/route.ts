import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sidebarItemId = Number.parseInt(params.id)
    const dynamicTable = await DatabaseService.getDynamicTableBySidebarId(sidebarItemId)

    if (!dynamicTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 })
    }

    const columns = await DatabaseService.getTableColumns(dynamicTable.id)
    return NextResponse.json(columns)
  } catch (error) {
    console.error("Error fetching columns:", error)
    return NextResponse.json({ error: "Failed to fetch columns" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sidebarItemId = Number.parseInt(params.id)
    const dynamicTable = await DatabaseService.getDynamicTableBySidebarId(sidebarItemId)

    if (!dynamicTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 })
    }

    const body = await request.json()

    const columnData = {
      table_id: dynamicTable.id, // Use dynamic table ID instead of sidebar item ID
      column_name: body.name, // Map 'name' to 'column_name'
      display_name: body.name, // Use same name for display
      data_type: body.data_type,
      is_required: body.is_required || false,
      default_value: body.default_value || null,
      sort_order: body.sort_order || 0,
      width: 150, // Default width
    }

    const column = await DatabaseService.createTableColumn(columnData)
    return NextResponse.json(column)
  } catch (error) {
    console.error("Error creating column:", error)
    return NextResponse.json({ error: "Failed to create column" }, { status: 500 })
  }
}
