"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const SearchInput = ({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) => (
  <div className={`relative ${className ?? "w-full sm:max-w-xs"}`}>
    <Search
      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden
    />
    <Input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="pl-9 pr-9"
    />
    {value ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onChange("")}
        aria-label="Clear search"
        className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
      >
        <X className="size-4" aria-hidden />
      </Button>
    ) : null}
  </div>
);
