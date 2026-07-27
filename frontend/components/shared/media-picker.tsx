"use client";

import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { MediaGrid } from "@/components/media/media-grid";
import { MediaUploader } from "@/components/media/media-uploader";
import { DataState } from "@/components/shared/data-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

/**
 * Browse-and-choose dialog over the shared library. Used by the user avatar,
 * category image, brand logo, attribute image swatch and product media, so one
 * asset can be attached in many places rather than re-uploaded.
 */
export const MediaPicker = ({
  open,
  onOpenChange,
  multiple = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  multiple?: boolean;
  onConfirm: (assets: MediaAsset[]) => void;
}) => {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [type, setType] = useState(ALL);
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<MediaAsset[]>([]);

  const debouncedSearch = useDebouncedValue(search);

  const query = useMediaList(
    {
      page,
      limit: 12,
      searchTerm: debouncedSearch || undefined,
      type: type === ALL ? undefined : type,
    },
    open,
  );

  const assets = query.data?.data ?? [];

  const toggle = (asset: MediaAsset) => {
    setChosen((current) => {
      const exists = current.some((item) => item.id === asset.id);
      if (multiple) {
        return exists ? current.filter((item) => item.id !== asset.id) : [...current, asset];
      }
      return exists ? [] : [asset];
    });
  };

  const close = () => {
    setChosen([]);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setChosen([]);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose from the media library</DialogTitle>
          <DialogDescription>
            {multiple
              ? "Select one or more assets. The same asset can be attached in several places."
              : "Select an asset. The same asset can be attached in several places."}
          </DialogDescription>
        </DialogHeader>

        {can("media:upload") ? <MediaUploader compact /> : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search files…"
          />
          <Select
            value={type}
            onValueChange={(value) => {
              setType(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by type">
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
          emptyTitle={debouncedSearch ? "Nothing matches that search" : "The library is empty"}
          emptyDescription={
            debouncedSearch ? "Try a different term." : "Upload a file to get started."
          }
          onRetry={() => void query.refetch()}
          loadingRows={3}
          loadingColumns={6}
        >
          <MediaGrid
            assets={assets}
            selectedIds={chosen.map((asset) => asset.id)}
            onSelect={toggle}
          />

          {query.data ? <Pagination meta={query.data.meta} onPageChange={setPage} /> : null}
        </DataState>

        <DialogFooter className="sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {chosen.length === 0
              ? "Nothing selected"
              : `${chosen.length} selected`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={chosen.length === 0}
              onClick={() => {
                onConfirm(chosen);
                close();
              }}
            >
              {multiple ? `Attach ${chosen.length || ""}`.trim() : "Select"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Single-image form field built on the picker: preview, choose, remove.
 */
export const MediaField = ({
  value,
  onChange,
  label = "Image",
  disabled = false,
}: {
  value: MediaAsset | null;
  onChange: (asset: MediaAsset | null) => void;
  label?: string;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3">
          <div className="relative size-16 overflow-hidden rounded-md border bg-muted">
            <Image
              src={value.thumbnailUrl ?? value.url}
              alt={value.altText ?? value.fileName}
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.fileName}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => setOpen(true)}
                disabled={disabled}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-destructive"
                onClick={() => onChange(null)}
                disabled={disabled}
              >
                <X className="size-3" aria-hidden />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          <ImagePlus className="size-4" aria-hidden />
          Choose {label.toLowerCase()}
        </Button>
      )}

      <MediaPicker
        open={open}
        onOpenChange={setOpen}
        onConfirm={(assets) => onChange(assets[0] ?? null)}
      />
    </div>
  );
};
