import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    console.log('Received PUT request for ID:', id);

    const numericId = Number.parseInt(id);
    if (isNaN(numericId)) {
      console.log('Invalid ID:', id);
      return NextResponse.json(
        { error: "Invalid ID", details: "ID must be a number" },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log('Request body:', body);
    
    if (!body || typeof body.name !== 'string') {
      console.log('Invalid request body:', body);
      return NextResponse.json(
        { error: "Invalid request", details: "Request must include a name field" },
        { status: 400 }
      );
    }

    const newName = body.name.trim();
    if (!newName) {
      console.log('Empty name provided');
      return NextResponse.json(
        { error: "Invalid name", details: "Name cannot be empty" },
        { status: 400 }
      );
    }

    try {
      console.log('Updating item name to:', newName);

      const updatedItem = await DatabaseService.updateSidebarItem(numericId, {
        name: newName
      });

      console.log('Item updated successfully:', updatedItem);
      return NextResponse.json(updatedItem);
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to update item', details: dbError instanceof Error ? dbError.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating sidebar item:", error);
    const message = error instanceof Error ? error.message : "Failed to update sidebar item";
    return NextResponse.json(
      { 
        error: message,
        details: error instanceof Error ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    console.log('DELETE request for id:', id);
    
    const numericId = Number.parseInt(id);
    if (isNaN(numericId)) {
      console.log('Invalid ID:', id);
      return NextResponse.json({ 
        error: "Invalid ID",
        details: "ID must be a number"
      }, { 
        status: 400,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
    }

    console.log('Attempting to delete item with ID:', numericId);
    await DatabaseService.deleteSidebarItem(numericId);
    console.log('Successfully deleted item with ID:', numericId);
    
    return NextResponse.json({ 
      success: true,
      message: "Item and all its contents deleted successfully" 
    }, { 
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error("Error deleting sidebar item:", error);
    const message = error instanceof Error ? error.message : "Failed to delete sidebar item";
    const details = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ 
      error: message,
      details 
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
  }
}
