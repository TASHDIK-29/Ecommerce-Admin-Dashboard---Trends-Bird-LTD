"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Sorting is a server round trip: the header writes `sort=field` or `sort=-field`
 * into the query the list hook sends.
 */
export const SortableHeader = ({
  field,
  label,
  sort,
  onSortChange,
  className,
}: {
  field: string;
  label: string;
  sort: string;
  onSortChange: (next: string) => void;
  className?: string;
}) => {
  const descending = sort === `-${field}`;
  const ascending = sort === field;
  const active = ascending || descending;

  const next = () => {
    if (ascending) return `-${field}`;
    if (descending) return "";
    return field;
  };

  const Icon = ascending ? ArrowUp : descending ? ArrowDown : ArrowUpDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSortChange(next())}
        aria-label={`Sort by ${label}`}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon className="size-3.5" aria-hidden />
      </button>
    </TableHead>
  );
};
