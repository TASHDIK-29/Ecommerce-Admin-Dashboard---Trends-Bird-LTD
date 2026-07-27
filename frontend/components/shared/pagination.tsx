"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiMeta } from "@/lib/types";

const PAGE_SIZES = ["10", "20", "50", "100"];

export const Pagination = ({
  meta,
  onPageChange,
  onLimitChange,
}: {
  meta: ApiMeta;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}) => {
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {meta.total === 0
          ? "No records"
          : `Showing ${from}–${to} of ${meta.total}`}
      </p>

      <div className="flex items-center gap-2">
        {onLimitChange ? (
          <Select
            value={String(meta.limit)}
            onValueChange={(value) => onLimitChange(Number(value))}
          >
            <SelectTrigger size="sm" className="w-[110px]" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Previous
        </Button>

        <span className="px-1 text-sm tabular-nums text-muted-foreground">
          {meta.totalPage === 0 ? "0 / 0" : `${meta.page} / ${meta.totalPage}`}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= meta.totalPage}
        >
          Next
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
};
