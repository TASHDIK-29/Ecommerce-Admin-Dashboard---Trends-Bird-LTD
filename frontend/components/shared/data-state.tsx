"use client";

import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";

import { Forbidden } from "./forbidden";

export const LoadingRows = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <div className="space-y-2" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-3">
        {Array.from({ length: columns }).map((_, columnIndex) => (
          <Skeleton key={columnIndex} className="h-9 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const Spinner = ({ label = "Loading" }: { label?: string }) => (
  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
    <Loader2 className="size-4 animate-spin" aria-hidden />
    <span>{label}</span>
  </div>
);

export const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
      <Inbox className="size-6 text-muted-foreground" aria-hidden />
    </div>
    <div className="space-y-1">
      <p className="font-medium">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
    {action}
  </div>
);

export const ErrorState = ({ error, onRetry }: { error: unknown; onRetry?: () => void }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
    <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
      <AlertCircle className="size-6 text-destructive" aria-hidden />
    </div>
    <div className="space-y-1">
      <p className="font-medium">Could not load this data</p>
      <p className="max-w-md text-sm text-muted-foreground">{errorMessage(error)}</p>
    </div>
    {onRetry ? (
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    ) : null}
  </div>
);

interface DataStateProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  loadingRows?: number;
  loadingColumns?: number;
  children: ReactNode;
}

/**
 * One place that decides between loading, forbidden, error, empty and content,
 * so every list screen behaves the same way.
 */
export const DataState = ({
  isLoading,
  isError,
  error,
  isEmpty,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  onRetry,
  loadingRows,
  loadingColumns,
  children,
}: DataStateProps) => {
  if (isLoading) return <LoadingRows rows={loadingRows} columns={loadingColumns} />;

  if (isError) {
    if (error instanceof ApiError && error.isForbidden) {
      return <Forbidden message={error.message} />;
    }
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (isEmpty) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }

  return <>{children}</>;
};
