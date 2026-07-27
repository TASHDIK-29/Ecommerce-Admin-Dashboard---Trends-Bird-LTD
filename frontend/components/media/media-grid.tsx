"use client";

import { Check, Film } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import type { MediaAsset } from "@/hooks/use-media";
import { formatBytes } from "@/lib/upload";
import { cn } from "@/lib/utils";

export const MediaThumb = ({ asset }: { asset: MediaAsset }) => {
  const source = asset.thumbnailUrl ?? asset.url;

  if (asset.type === "VIDEO") {
    return (
      <div className="flex size-full items-center justify-center bg-muted">
        <Film className="size-6 text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <Image
      src={source}
      alt={asset.altText ?? asset.fileName}
      fill
      sizes="(max-width: 768px) 33vw, 160px"
      className="object-cover"
    />
  );
};

export const MediaGrid = ({
  assets,
  selectedIds = [],
  onSelect,
  onOpen,
}: {
  assets: MediaAsset[];
  selectedIds?: string[];
  onSelect?: (asset: MediaAsset) => void;
  onOpen?: (asset: MediaAsset) => void;
}) => {
  const selected = new Set(selectedIds);

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {assets.map((asset) => {
        const isSelected = selected.has(asset.id);
        const activate = () => (onSelect ? onSelect(asset) : onOpen?.(asset));

        return (
          <li key={asset.id}>
            <button
              type="button"
              onClick={activate}
              aria-pressed={onSelect ? isSelected : undefined}
              className={cn(
                "group w-full overflow-hidden rounded-lg border text-left transition-colors",
                isSelected
                  ? "border-primary ring-2 ring-primary/30"
                  : "hover:border-muted-foreground/40",
              )}
            >
              <div className="relative aspect-square bg-muted">
                <MediaThumb asset={asset} />

                {isSelected ? (
                  <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" aria-hidden />
                  </span>
                ) : null}

                {asset.type === "VIDEO" ? (
                  <Badge variant="secondary" className="absolute left-1.5 top-1.5 text-[10px]">
                    Video
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-0.5 p-2">
                <p className="truncate text-xs font-medium" title={asset.fileName}>
                  {asset.fileName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {asset.width && asset.height
                    ? `${asset.width}×${asset.height} · ${formatBytes(asset.size)}`
                    : formatBytes(asset.size)}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
};
