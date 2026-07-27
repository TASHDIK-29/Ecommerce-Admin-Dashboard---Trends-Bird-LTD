"use client";

import { ChevronsDownUp, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CategoryDialog } from "@/components/categories/category-dialog";
import { CategoryTree } from "@/components/categories/category-tree";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataState } from "@/components/shared/data-state";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  flattenTree,
  useCategoryTree,
  useDeleteCategory,
  type CategoryNode,
} from "@/hooks/use-categories";
import { errorMessage } from "@/lib/form-errors";

const ALL = "all";

export default function CategoriesPage() {
  const [status, setStatus] = useState(ALL);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsedOnce, setCollapsedOnce] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  const [parentForNew, setParentForNew] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CategoryNode | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const query = useCategoryTree({ isActive: status === ALL ? undefined : status });
  const deleteCategory = useDeleteCategory();

  const tree = query.data ?? [];
  const allNodes = flattenTree(tree);
  const branchIds = allNodes.filter((node) => node.children.length > 0).map((node) => node.id);

  // Branches start open so the shape of the tree is visible straight away,
  // until the reviewer collapses it themselves.
  const effectiveExpanded =
    collapsedOnce || expanded.size > 0 ? expanded : new Set(branchIds);

  const toggle = (id: string) => {
    const next = new Set(effectiveExpanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsedOnce(true);
    setExpanded(next);
  };

  const openCreate = (parentId: string | null) => {
    setEditing(null);
    setParentForNew(parentId);
    setDialogOpen(true);
  };

  const openEdit = (node: CategoryNode) => {
    setEditing(node);
    setParentForNew(null);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);

    try {
      await deleteCategory.mutateAsync(deleting.id);
      toast.success(`"${deleting.name}" deleted.`);
      setDeleting(null);
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="The nested tree a product is filed under. Nesting has no depth limit."
        actions={
          <PermissionGate permission="category:create">
            <Button onClick={() => openCreate(null)}>
              <Plus className="size-4" aria-hidden />
              New category
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                <SelectItem value="true">Active only</SelectItem>
                <SelectItem value="false">Inactive only</SelectItem>
              </SelectContent>
            </Select>

            {branchIds.length > 0 ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCollapsedOnce(true);
                    setExpanded(new Set(branchIds));
                  }}
                >
                  <ChevronsUpDown className="size-4" aria-hidden />
                  Expand all
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCollapsedOnce(true);
                    setExpanded(new Set());
                  }}
                >
                  <ChevronsDownUp className="size-4" aria-hidden />
                  Collapse all
                </Button>
              </div>
            ) : null}
          </div>

          <DataState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={tree.length === 0}
            emptyTitle={status === ALL ? "No categories yet" : "Nothing matches that filter"}
            emptyDescription={
              status === ALL
                ? "Create a top-level category, then nest others beneath it."
                : "Try a different status filter."
            }
            onRetry={() => void query.refetch()}
            loadingRows={6}
            loadingColumns={2}
          >
            <>
              <CategoryTree
                nodes={tree}
                expanded={effectiveExpanded}
                onToggle={toggle}
                onEdit={openEdit}
                onAddChild={(node) => openCreate(node.id)}
                onDelete={(node) => {
                  setDeleteError(null);
                  setDeleting(node);
                }}
              />
              <p className="text-sm text-muted-foreground">
                {allNodes.length} categor{allNodes.length === 1 ? "y" : "ies"} ·{" "}
                {tree.length} at the top level
              </p>
            </>
          </DataState>
        </CardContent>
      </Card>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
        defaultParentId={parentForNew}
        tree={tree}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
        title={`Delete "${deleting?.name}"?`}
        description={
          deleting && deleting.children.length > 0
            ? `This category has ${deleting.children.length} child categor(y/ies). The server refuses the delete rather than orphaning them.`
            : "This cannot be undone."
        }
        confirmLabel="Delete category"
        destructive
        isPending={deleteCategory.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
