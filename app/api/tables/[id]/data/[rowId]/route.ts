import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function PUT(request: NextRequest, { params }: { params: { id: string; rowId: string } }) {
  try {
    const rowId = Number.parseInt(params.rowId)
    const body = await request.json()

    const row = await DatabaseService.updateTableRow(rowId, body.data)
    return NextResponse.json(row)
  } catch (error) {
    console.error("Error updating row:", error)
    return NextResponse.json({ error: "Failed to update row" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; rowId: string } }) {
  try {
    const rowId = Number.parseInt(params.rowId)

    await DatabaseService.deleteTableRow(rowId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting row:", error)
    return NextResponse.json({ error: "Failed to delete row" }, { status: 500 })
  }
}
