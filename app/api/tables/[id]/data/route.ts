import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tableId = Number.parseInt(params.id)
    const data = await DatabaseService.getTableData(tableId)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching table data:", error)
    return NextResponse.json({ error: "Failed to fetch table data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sidebarItemId = Number.parseInt(params.id);
    const body = await request.json();

    // Get the dynamic table ID first
    const dynamicTable = await DatabaseService.getDynamicTableBySidebarId(sidebarItemId);
    
    if (!dynamicTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    console.log('Creating row in table:', dynamicTable.id, 'with data:', body.data);

    const row = await DatabaseService.createTableRow(dynamicTable.id, body.data);
    
    console.log('Created row:', row);
    
    return NextResponse.json(row);
  } catch (error) {
    console.error("Error creating row:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to create row"
    }, { status: 500 });
  }
}
