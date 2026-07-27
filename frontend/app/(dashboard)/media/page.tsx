"use client";

import { useState } from "react";

import { MediaDetailsDialog } from "@/components/media/media-details-dialog";
import { MediaGrid } from "@/components/media/media-grid";
import { MediaUploader } from "@/components/media/media-uploader";
import { DataState } from "@/components/shared/data-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useMediaList, type MediaAsset } from "@/hooks/use-media";
import { useAuth } from "@/lib/auth-context";

const ALL = "all";

export default function MediaPage() {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [type, setType] = useState(ALL);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(24);
  const [active, setActive] = useState<MediaAsset | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const query = useMediaList({
    page,
    limit,
    searchTerm: debouncedSearch || undefined,
    type: type === ALL ? undefined : type,
  });

  const assets = query.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media"
        description="A shared library. One asset can be attached to many products, categories and brands."
      />

      {can("media:upload") ? (
        <Card>
          <CardContent className="pt-6">
            <MediaUploader />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search by file name, title or alt text…"
            />

            <Select
              value={type}
              onValueChange={(value) => {
                setType(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                <SelectItem value="IMAGE">Images</SelectItem>
                <SelectItem value="VIDEO">Videos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={assets.length === 0}
            emptyTitle={
              debouncedSearch || type !== ALL
                ? "Nothing matches those filters"
                : "The library is empty"
            }
            emptyDescription={
              debouncedSearch || type !== ALL
                ? "Try a different term, or clear the filters."
                : "Upload a file above to get started."
            }
            onRetry={() => void query.refetch()}
            loadingRows={3}
            loadingColumns={6}
          >
            <MediaGrid assets={assets} onOpen={setActive} />

            {query.data ? (
              <Pagination
                meta={query.data.meta}
                onPageChange={setPage}
                onLimitChange={(next) => {
                  setLimit(next);
                  setPage(1);
                }}
              />
            ) : null}
          </DataState>
        </CardContent>
      </Card>

      <MediaDetailsDialog
        asset={active}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
      />
    </div>
  );
}
