import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.sidebar_item_id || !body.table_name || !body.display_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Create the dynamic table
    const table = await DatabaseService.createDynamicTable({
      sidebar_item_id: Number(body.sidebar_item_id),
      table_name: body.table_name,
      display_name: body.display_name,
      description: body.description
    })

    return NextResponse.json(table)
  } catch (error) {
    console.error("Error creating dynamic table:", error)
    return NextResponse.json(
      { error: "Failed to create dynamic table" },
      { status: 500 }
    )
  }
}
