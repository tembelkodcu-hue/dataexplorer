"use client"

import { useState } from "react"
import { DynamicSidebar } from "@/components/dynamic-sidebar"
import { TableView } from "@/components/table-view"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function HomePage() {
  const [selectedItem, setSelectedItem] = useState<{
    id: number
    name: string
    type: "folder" | "table"
  } | null>(null)

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <DynamicSidebar selectedItem={selectedItem} onItemSelect={setSelectedItem} />
        <main className="flex-1 overflow-hidden">
          {selectedItem?.type === "table" ? (
            <TableView itemId={selectedItem.id} itemName={selectedItem.name} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">Dynamic Database Manager</h2>
                <p>Select a table from the sidebar to view and edit data</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  )
}
