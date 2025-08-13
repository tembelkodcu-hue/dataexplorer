"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, Folder, Table, Plus, Edit, Trash2, FolderPlus, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar"
import { toast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [contextItem, setContextItem] = useState<SidebarItem | null>(null)
  const [newItemName, setNewItemName] = useState("")
  const [newItemType, setNewItemType] = useState<"folder" | "table">("folder")
  const [newItemParent, setNewItemParent] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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
      setIsLoading(true);

      // Validate name
      if (!newItemName.trim()) {
        toast({
          title: "Error",
          description: "Name is required",
          variant: "destructive",
        });
        return;
      }

      // Format the name for the database
      const formattedName = newItemName.trim();
      const dbName = formattedName
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

      const response = await fetch("/api/sidebar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formattedName,
          parent_id: newItemParent,
          item_type: newItemType,
          icon: newItemType === "folder" ? "folder" : "table",
          table_name: dbName, // Add database-friendly name
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create item");
      }

      await loadSidebarItems();
      setIsCreateDialogOpen(false);
      setNewItemName("");
      setNewItemParent(null);
      setNewItemType("folder");

      // If parent folder exists, expand it
      if (newItemParent) {
        setExpandedItems((prev) => new Set([...prev, newItemParent]));
      }

      toast({
        title: "Success",
        description: `${newItemType === "folder" ? "Folder" : "Table"} created successfully`,
      });
    } catch (error) {
      console.error("Failed to create item:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleEditItem = async () => {
    if (!contextItem) {
      console.error("No context item found");
      return;
    }

    try {
      setIsLoading(true);
      console.log('Attempting to edit item:', contextItem);

      // Validate name
      const trimmedName = newItemName.trim();
      if (!trimmedName) {
        console.log('Empty name provided');
        toast({
          title: "Error",
          description: "Name is required",
          variant: "destructive",
        });
        return;
      }

      // Don't update if name hasn't changed
      if (trimmedName === contextItem.name) {
        console.log('Name unchanged, closing dialog');
        setIsEditDialogOpen(false);
        setNewItemName("");
        setContextItem(null);
        return;
      }

      console.log('Sending update request for:', { id: contextItem.id, name: trimmedName });
      
      const response = await fetch(`/api/sidebar/${contextItem.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify({
          name: trimmedName,
        }),
      });

      console.log('Update response status:', response.status);
      const data = await response.json();
      console.log('Update response data:', data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to update item");
      }

      await loadSidebarItems();
      setIsEditDialogOpen(false);
      setNewItemName("");
      setContextItem(null);

      toast({
        title: "Success",
        description: `${contextItem.item_type === "folder" ? "Folder" : "Table"} renamed successfully`,
      });
    } catch (error) {
      console.error("Failed to edit item:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeleteItem = async (item: SidebarItem) => {
    try {
      setIsLoading(true);
      console.log('Attempting to delete item:', item);
      
      if (item.children && item.children.length > 0) {
        toast({
          title: "Cannot Delete",
          description: "Please delete or move all items inside this folder first",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/sidebar/${item.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log('Delete response status:', response.status);
      const data = await response.json();
      console.log('Delete response data:', data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete item");
      }

      await loadSidebarItems();
      if (selectedItem?.id === item.id) {
        onItemSelect({ id: 0, name: "", type: "folder" });
      }

      toast({
        title: "Success",
        description: `${item.item_type === "folder" ? "Folder" : "Table"} deleted successfully`,
      });

      setIsDeleteDialogOpen(false);
      setContextItem(null);
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
            <ContextMenuItem 
              onClick={() => {
                setContextItem(item);
                setIsDeleteDialogOpen(true);
              }} 
              className="text-destructive"
            >
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
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleCreateItem} disabled={!newItemName.trim() || isLoading}>
                {isLoading ? "Creating..." : "Create"}
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
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleEditItem} disabled={!newItemName.trim() || isLoading}>
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {contextItem?.item_type === "folder" ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-yellow-500 inline-block mr-1" />
                  This will delete the folder &quot;{contextItem?.name}&quot; and all its contents.
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-yellow-500 inline-block mr-1" />
                  This will permanently delete the table &quot;{contextItem?.name}&quot; and all its data.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
              onClick={() => contextItem && handleDeleteItem(contextItem)}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
