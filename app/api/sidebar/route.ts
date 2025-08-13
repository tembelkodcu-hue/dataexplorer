import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib"

export async function GET() {
  try {
    console.log("Fetching sidebar items...")
    const items = await DatabaseService.getSidebarItems()
    console.log("Successfully fetched sidebar items:", items.length)
    return NextResponse.json(items)
  } catch (error: any) {
    console.error("Error fetching sidebar items:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch sidebar items",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("Creating new sidebar item...")

    await DatabaseService.initializeTables()

    const body = await request.json()
    const { name, parent_id, item_type, icon } = body

    if (!name || !item_type) {
      return NextResponse.json({ error: "Name and item_type are required" }, { status: 400 })
    }

    // Get the next sort order for the parent
    const siblings = await DatabaseService.getSidebarItems()
    const parentSiblings = siblings.filter((item) => item.parent_id === parent_id)
    const nextSortOrder = Math.max(...parentSiblings.map((item) => item.sort_order), 0) + 1

    console.log("Creating sidebar item with data:", { name, parent_id, item_type, icon, sort_order: nextSortOrder })

    const newItem = await DatabaseService.createSidebarItem({
      name,
      parent_id,
      item_type,
      icon,
      sort_order: nextSortOrder,
    })

    // If creating a table, also create the dynamic table record
    if (item_type === "table") {
      try {
        const tableName = name
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "")
          .substring(0, 64); // MySQL table name length limit

        console.log("Creating dynamic table record...", {
          sidebar_item_id: newItem.id,
          table_name: tableName,
          display_name: name
        });

        const dynamicTable = await DatabaseService.createDynamicTable({
          sidebar_item_id: newItem.id,
          table_name: tableName,
          display_name: name,
          description: `Dynamic table: ${name}`,
        });

        console.log("Successfully created dynamic table:", dynamicTable);

        // Add a default column if needed
        // await DatabaseService.createTableColumn({
        //   table_id: dynamicTable.id,
        //   column_name: "id",
        //   display_name: "ID",
        //   data_type: "number",
        //   is_required: true,
        //   sort_order: 0,
        //   width: 100
        // });
      } catch (error) {
        console.error("Error creating dynamic table:", error);
        // Delete the sidebar item since table creation failed
        await DatabaseService.deleteSidebarItem(newItem.id);
        throw error;
      }
    }

    console.log("Successfully created sidebar item:", newItem)
    return NextResponse.json(newItem)
  } catch (error: any) {
    console.error("Error creating sidebar item:", error)
    return NextResponse.json(
      {
        error: "Failed to create sidebar item",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
