"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, Folder, Table, Plus, Edit, Trash2, FolderPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface SidebarItem {
  id: number
  name: string
  parent_id: number | null
  item_type: "folder" | "table"
  icon?: string
  sort_order: number
  children?: SidebarItem[]
}

interface DynamicSidebarProps {
  selectedItem: { id: number; name: string; type: "folder" | "table" } | null
  onItemSelect: (item: { id: number; name: string; type: "folder" | "table" }) => void
}

export function DynamicSidebar({ selectedItem, onItemSelect }: DynamicSidebarProps) {
  const [items, setItems] = useState<SidebarItem[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([]))
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [contextItem, setContextItem] = useState<SidebarItem | null>(null)
  const [newItemName, setNewItemName] = useState("")
  const [newItemType, setNewItemType] = useState<"folder" | "table">("folder")
  const [newItemParent, setNewItemParent] = useState<number | null>(null)

  useEffect(() => {
    loadSidebarItems()
  }, [])

  const loadSidebarItems = async () => {
    try {
      const response = await fetch("/api/sidebar")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (Array.isArray(data)) {
        setItems(buildTree(data))
      } else {
        console.error("API returned non-array data:", data)
        setItems([]) // Set empty array as fallback
      }
    } catch (error) {
      console.error("Failed to load sidebar items:", error)
      setItems([])
    }
  }

  const buildTree = (flatItems: SidebarItem[]): SidebarItem[] => {
    if (!Array.isArray(flatItems) || flatItems.length === 0) {
      return []
    }

    const itemMap = new Map<number, SidebarItem>()
    const rootItems: SidebarItem[] = []

    // Create map of all items
    flatItems.forEach((item) => {
      itemMap.set(item.id, { ...item, children: [] })
    })

    // Build tree structure
    flatItems.forEach((item) => {
      const treeItem = itemMap.get(item.id)!
      if (item.parent_id === null) {
        rootItems.push(treeItem)
      } else {
        const parent = itemMap.get(item.parent_id)
        if (parent) {
          parent.children!.push(treeItem)
        }
      }
    })

    return rootItems
  }

  const toggleExpanded = (itemId: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const handleCreateItem = async () => {
    try {
      const response = await fetch("/api/sidebar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItemName,
          parent_id: newItemParent,
          item_type: newItemType,
          icon: newItemType === "folder" ? "folder" : "table",
        }),
      })

      if (response.ok) {
        await loadSidebarItems()
        setIsCreateDialogOpen(false)
        setNewItemName("")
        setNewItemParent(null)
        setNewItemType("folder")
      }
    } catch (error) {
      console.error("Failed to create item:", error)
    }
  }

  const handleEditItem = async () => {
    if (!contextItem) return

    try {
      const response = await fetch(`/api/sidebar/${contextItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItemName,
        }),
      })

      if (response.ok) {
        await loadSidebarItems()
        setIsEditDialogOpen(false)
        setNewItemName("")
        setContextItem(null)
      }
    } catch (error) {
      console.error("Failed to edit item:", error)
    }
  }

  const handleDeleteItem = async (item: SidebarItem) => {
    try {
      const response = await fetch(`/api/sidebar/${item.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await loadSidebarItems()
        if (selectedItem?.id === item.id) {
          onItemSelect({ id: 0, name: "", type: "folder" })
        }
      }
    } catch (error) {
      console.error("Failed to delete item:", error)
    }
  }

  const renderItem = (item: SidebarItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.id)
    const isSelected = selectedItem?.id === item.id

    return (
      <div key={item.id}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={cn(
                "flex items-center gap-2 px-2 py-1 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm",
                isSelected && "bg-accent text-accent-foreground",
              )}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={() => {
                if (item.item_type === "table") {
                  onItemSelect({ id: item.id, name: item.name, type: item.item_type })
                }
                if (hasChildren) {
                  toggleExpanded(item.id)
                }
              }}
            >
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpanded(item.id)
                  }}
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
              )}
              {!hasChildren && <div className="w-4" />}

              {item.item_type === "folder" ? (
                <Folder className="h-4 w-4 text-blue-500" />
              ) : (
                <Table className="h-4 w-4 text-green-500" />
              )}

              <span className="text-sm truncate">{item.name}</span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {item.item_type === "folder" && (
              <>
                <ContextMenuItem
                  onClick={() => {
                    setNewItemParent(item.id)
                    setNewItemType("folder")
                    setIsCreateDialogOpen(true)
                  }}
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Folder
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    setNewItemParent(item.id)
                    setNewItemType("table")
                    setIsCreateDialogOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Table
                </ContextMenuItem>
              </>
            )}
            <ContextMenuItem
              onClick={() => {
                setContextItem(item)
                setNewItemName(item.name)
                setIsEditDialogOpen(true)
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleDeleteItem(item)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {hasChildren && isExpanded && <div>{item.children!.map((child) => renderItem(child, level + 1))}</div>}
      </div>
    )
  }

  return (
    <>
      <Sidebar className="w-64 border-r">
        <SidebarHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Database Explorer</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewItemParent(null)
                setNewItemType("folder")
                setIsCreateDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <div className="space-y-1">{items.map((item) => renderItem(item))}</div>
        </SidebarContent>
      </Sidebar>

      {/* Create Item Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New {newItemType === "folder" ? "Folder" : "Table"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="item-name">Name</Label>
              <Input
                id="item-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={`Enter ${newItemType} name`}
              />
            </div>
            <div>
              <Label htmlFor="item-type">Type</Label>
              <Select value={newItemType} onValueChange={(value: "folder" | "table") => setNewItemType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="folder">Folder</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateItem} disabled={!newItemName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {contextItem?.item_type === "folder" ? "Folder" : "Table"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Enter new name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditItem} disabled={!newItemName.trim()}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
