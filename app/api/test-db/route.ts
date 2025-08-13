import { DatabaseService } from "@/lib/database"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("Testing database connection...")

    // Test basic connection
    const { sql } = await import("@/lib/database")
    const testQuery = await sql`SELECT NOW() as current_time`
    console.log("Database connection successful:", testQuery[0])

    // Test table initialization
    console.log("Initializing tables...")
    await DatabaseService.initializeTables()
    console.log("Tables initialized successfully")

    // Test getting sidebar items
    console.log("Getting sidebar items...")
    const items = await DatabaseService.getSidebarItems()
    console.log("Sidebar items:", items)

    return NextResponse.json({
      success: true,
      message: "Database test successful",
      connection: testQuery[0],
      sidebarItems: items,
    })
  } catch (error: any) {
    console.error("Database test failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
