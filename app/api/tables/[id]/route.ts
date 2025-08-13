import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sidebarItemId = Number.parseInt(params.id)
    const table = await DatabaseService.getDynamicTableBySidebarId(sidebarItemId)

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 })
    }

    return NextResponse.json(table)
  } catch (error) {
    console.error("Error fetching table:", error)
    return NextResponse.json({ error: "Failed to fetch table" }, { status: 500 })
  }
}
