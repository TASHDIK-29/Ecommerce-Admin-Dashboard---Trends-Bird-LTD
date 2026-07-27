"use client";

import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { PermissionGate } from "@/components/shared/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CategoryNode } from "@/hooks/use-categories";
import { cn } from "@/lib/utils";

const TreeRow = ({
  node,
  expanded,
  onToggle,
  onEdit,
  onAddChild,
  onDelete,
}: {
  node: CategoryNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (node: CategoryNode) => void;
  onAddChild: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode) => void;
}) => {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);

  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent/50"
        style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? "Collapse" : "Expand"} ${node.name}`}
            className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-accent"
          >
            {isOpen ? (
              <ChevronDown className="size-4" aria-hidden />
            ) : (
              <ChevronRight className="size-4" aria-hidden />
            )}
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-medium", !node.isActive && "text-muted-foreground")}>
              {node.name}
            </span>
            <code className="text-xs text-muted-foreground">{node.slug}</code>
            {!node.isActive ? (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            ) : null}
            {hasChildren ? (
              <span className="text-xs text-muted-foreground">
                {node.children.length} child{node.children.length === 1 ? "" : "ren"}
              </span>
            ) : null}
          </div>
        </div>

        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          #{node.sortOrder}
        </span>

        <div className="flex shrink-0 gap-1">
          <PermissionGate permission="category:create">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAddChild(node)}
              aria-label={`Add a child under ${node.name}`}
              title="Add child"
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </PermissionGate>

          <PermissionGate permission="category:update">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(node)}
              aria-label={`Edit ${node.name}`}
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
          </PermissionGate>

          <PermissionGate permission="category:delete">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(node)}
              aria-label={`Delete ${node.name}`}
            >
              <Trash2 className="size-4 text-destructive" aria-hidden />
            </Button>
          </PermissionGate>
        </div>
      </div>

      {hasChildren && isOpen ? (
        <ul>
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
};

export const CategoryTree = ({
  nodes,
  expanded,
  onToggle,
  onEdit,
  onAddChild,
  onDelete,
}: {
  nodes: CategoryNode[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (node: CategoryNode) => void;
  onAddChild: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode) => void;
}) => (
  <ul className="divide-y rounded-md border">
    {nodes.map((node) => (
      <TreeRow
        key={node.id}
        node={node}
        expanded={expanded}
        onToggle={onToggle}
        onEdit={onEdit}
        onAddChild={onAddChild}
        onDelete={onDelete}
      />
    ))}
  </ul>
);
