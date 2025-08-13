import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function PUT(request: NextRequest, { params }: { params: { id: string; columnId: string } }) {
  try {
    const columnId = Number.parseInt(params.columnId)
    const body = await request.json()

    const column = await DatabaseService.updateTableColumn(columnId, body)
    return NextResponse.json(column)
  } catch (error) {
    console.error("Error updating column:", error)
    return NextResponse.json({ error: "Failed to update column" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; columnId: string } }) {
  try {
    const columnId = Number.parseInt(params.columnId)

    await DatabaseService.deleteTableColumn(columnId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting column:", error)
    return NextResponse.json({ error: "Failed to delete column" }, { status: 500 })
  }
}
