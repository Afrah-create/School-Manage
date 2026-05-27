"use client";

import type { TimetableTemplate } from "@uganda-cbc-sms/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function TimetablePublishBar({
  template,
  onValidate,
  onPublish,
  validating,
  publishing,
  disabled,
}: {
  template: TimetableTemplate | null | undefined;
  onValidate: () => void;
  onPublish: () => void;
  validating?: boolean;
  publishing?: boolean;
  disabled?: boolean;
}) {
  if (!template) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={template.status === "published" ? "success" : template.status === "draft" ? "neutral" : "warning"}>
          {template.status}
        </Badge>
        <span className="text-sm font-medium text-foreground">{template.name}</span>
        <span className="text-xs text-muted-foreground">
          v{template.version} · {template.periodCount} periods · {template.entryCount} entries
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" loading={validating} disabled={disabled} onClick={onValidate}>
          Validate
        </Button>
        <Button
          type="button"
          loading={publishing}
          disabled={disabled || template.status !== "draft"}
          onClick={onPublish}
        >
          Publish timetable
        </Button>
      </div>
    </div>
  );
}
