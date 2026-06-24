"use client";

import {
  X,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Film,
  File as FileIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type PreviewFile = {
  id: string;
  url?: string;
  name: string;
  type: string;
};

function iconFor(type: string) {
  if (type.startsWith("video/")) return Film;
  if (type === "application/pdf") return FileText;
  if (type.includes("spreadsheet") || type.includes("excel")) return FileSpreadsheet;
  if (type.includes("typescript") || type.includes("javascript") || type.includes("json"))
    return FileCode;
  if (type.includes("zip") || type.includes("compressed")) return FileArchive;
  return FileIcon;
}

export function FilePreview({
  files,
  onRemove,
  className,
}: {
  files: PreviewFile[];
  onRemove?: (id: string) => void;
  className?: string;
}) {
  if (!files.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {files.map((f) => {
        const isImage = f.type.startsWith("image/") && f.url && f.url !== "#";
        const Icon = iconFor(f.type);
        return (
          <div
            key={f.id}
            className="group relative flex items-center gap-2 rounded-lg border bg-card p-2 pr-7"
          >
            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt={f.name} className="size-full object-cover" />
              ) : (
                <Icon className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="max-w-[140px] truncate text-xs font-medium">{f.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase">
                {f.type.split("/").pop()?.split(".").pop() || "file"}
              </p>
            </div>
            {onRemove && (
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => onRemove(f.id)}
                className="absolute top-1.5 right-1.5 text-muted-foreground transition hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
