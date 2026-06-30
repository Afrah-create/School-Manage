"use client";

import type { ReactNode } from "react";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import {
  notificationExamName,
  notificationSubjectCode,
  notificationVisual,
} from "@/lib/notificationPresentation";
import { snippetText, type NotificationItem } from "@/lib/notifications";

type Props = {
  item: NotificationItem;
  variant?: "compact" | "full";
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  onOpen?: () => void;
  actions?: ReactNode;
  disabled?: boolean;
};

export function NotificationCard({
  item,
  variant = "compact",
  selected,
  onSelect,
  onOpen,
  actions,
  disabled,
}: Props) {
  const unread = !item.readAt;
  const visual = notificationVisual(item.type, item.metadata);
  const { Icon } = visual;
  const examName = notificationExamName(item.metadata);
  const subjectCode = notificationSubjectCode(item.metadata);
  const isFull = variant === "full";

  const content = (
  <>
      <span
        className={`flex shrink-0 items-center justify-center rounded-full ${visual.iconWrap} ${
          isFull ? "h-10 w-10" : "mt-0.5 h-9 w-9"
        }`}
        aria-hidden
      >
        <Icon className={`${isFull ? "h-5 w-5" : "h-4 w-4"} ${visual.iconColor}`} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${visual.iconWrap} ${visual.iconColor}`}
          >
            {visual.label}
          </span>
          {unread ? (
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-label="Unread" />
          ) : null}
          {item.archivedAt ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Archived
            </span>
          ) : null}
        </div>
        <p
          className={`mt-1 leading-snug ${isFull ? "text-base" : "text-sm"} ${
            unread ? "font-semibold text-foreground" : "font-medium text-foreground"
          }`}
        >
          {item.title}
        </p>
        {(examName || subjectCode) && (
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {[examName, subjectCode].filter(Boolean).join(" · ")}
          </p>
        )}
        <p
          className={`mt-1 text-muted-foreground ${isFull ? "text-sm leading-relaxed" : "line-clamp-2 text-xs leading-relaxed"}`}
        >
          {isFull ? item.body : snippetText(item.body, 120)}
        </p>
        <p className={`mt-1.5 text-muted-foreground/80 ${isFull ? "text-xs" : "text-[11px]"}`}>
          {formatRelativeTime(item.createdAt)}
        </p>
        {actions ? <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
  </>
  );

  const shellClass = `group w-full rounded-lg text-left transition-ui ${visual.accentBorder} ${
    isFull
      ? `border border-border border-l-[3px] p-3 ${unread ? "bg-accent/20" : "bg-card"} hover:bg-accent/30`
      : `border-l-[3px] px-2 py-2 ${unread ? "bg-accent/30" : "bg-transparent"} hover:bg-accent/40`
  }`;

  if (onOpen) {
    return (
      <div className={`flex items-start gap-3 ${shellClass} ${disabled ? "opacity-60" : ""}`}>
        {onSelect ? (
          <input
            type="checkbox"
            className="mt-3 h-4 w-4 shrink-0 rounded border-border text-brand focus:ring-brand"
            checked={selected}
            disabled={disabled}
            onChange={(e) => onSelect(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${item.title}`}
          />
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-not-allowed"
        >
          {content}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 ${shellClass}`}>
      {onSelect ? (
        <input
          type="checkbox"
          className="mt-3 h-4 w-4 shrink-0 rounded border-border text-brand focus:ring-brand"
          checked={selected}
          disabled={disabled}
          onChange={(e) => onSelect(e.target.checked)}
          aria-label={`Select ${item.title}`}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 items-start gap-3">{content}</div>
    </div>
  );
}
