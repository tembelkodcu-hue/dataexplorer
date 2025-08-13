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
    const tableId = Number.parseInt(params.id)
    const body = await request.json()

    const row = await DatabaseService.createTableRow(tableId, body.data)
    return NextResponse.json(row)
  } catch (error) {
    console.error("Error creating row:", error)
    return NextResponse.json({ error: "Failed to create row" }, { status: 500 })
  }
}
