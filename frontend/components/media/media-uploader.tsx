"use client";

import { CloudUpload, FileWarning, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useUploadMedia, type MediaAsset } from "@/hooks/use-media";
import { errorMessage } from "@/lib/form-errors";
import { formatBytes } from "@/lib/upload";
import { cn } from "@/lib/utils";

const MAX_FILES = 10;

export const MediaUploader = ({
  onUploaded,
  compact = false,
}: {
  onUploaded?: (assets: MediaAsset[]) => void;
  compact?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMedia = useUploadMedia();

  const [queue, setQueue] = useState<File[]>([]);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    setError(null);

    const next = [...queue, ...Array.from(incoming)].slice(0, MAX_FILES);
    if (queue.length + incoming.length > MAX_FILES) {
      setError(`At most ${MAX_FILES} files can be uploaded at once.`);
    }
    setQueue(next);
  };

  const removeFile = (index: number) =>
    setQueue((current) => current.filter((_, position) => position !== index));

  const startUpload = async () => {
    if (queue.length === 0) return;

    setError(null);
    setPercent(0);

    try {
      const assets = await uploadMedia.mutateAsync({
        files: queue,
        onProgress: (progress) => setPercent(progress.percent),
      });

      toast.success(`${assets.length} file(s) uploaded.`);
      setQueue([]);
      setPercent(0);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded?.(assets);
    } catch (uploadError) {
      setError(errorMessage(uploadError));
      setPercent(0);
    }
  };

  const isUploading = uploadMedia.isPending;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          compact && "p-4",
        )}
      >
        <CloudUpload className="size-6 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium">Drop files here, or</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            Choose files
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP, GIF, AVIF, MP4, WebM · up to {MAX_FILES} files
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      {queue.length > 0 ? (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {queue.length} file{queue.length === 1 ? "" : "s"} ready
            </p>
            <p className="text-xs text-muted-foreground">
              Sent as one request — if any file is rejected, none are saved.
            </p>
          </div>

          <ul className="space-y-1">
            {queue.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-2 rounded bg-muted/50 px-2 py-1.5 text-sm"
              >
                <span className="truncate">{file.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                  {!isUploading ? (
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      aria-label={`Remove ${file.name}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          {isUploading ? (
            <div className="space-y-1">
              <Progress value={percent} />
              <p className="text-xs text-muted-foreground">Uploading… {percent}%</p>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            {!isUploading ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setQueue([])}>
                Clear
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={startUpload} disabled={isUploading}>
              {isUploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Upload
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <FileWarning className="size-4" aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
};
