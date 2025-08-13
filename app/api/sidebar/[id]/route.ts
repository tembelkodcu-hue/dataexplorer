import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    const updatedItem = await DatabaseService.updateSidebarItem(id, body)
    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error("Error updating sidebar item:", error)
    return NextResponse.json({ error: "Failed to update sidebar item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    await DatabaseService.deleteSidebarItem(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting sidebar item:", error)
    return NextResponse.json({ error: "Failed to delete sidebar item" }, { status: 500 })
  }
}
