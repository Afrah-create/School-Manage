"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Spinner } from "@/components/feedback/Spinner";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { snippetText, type NotificationItem } from "@/lib/notifications";
import { queryStatus } from "@/lib/queryStatus";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
} from "@/hooks/useNotifications";

type Props = {
  open: boolean;
  onClose: () => void;
};

function NotificationRow({
  item,
  onOpen,
  disabled,
}: {
  item: NotificationItem;
  onOpen: (item: NotificationItem) => void;
  disabled?: boolean;
}) {
  const unread = !item.readAt;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onOpen(item)}
      className={`w-full rounded-md px-3 py-2.5 text-left transition-ui hover:bg-accent/50 disabled:opacity-60 ${
        unread ? "bg-accent/20" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {unread ? (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden />
        ) : (
          <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-sm leading-snug ${unread ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
            {item.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{snippetText(item.body)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{formatRelativeTime(item.createdAt)}</p>
        </div>
      </div>
    </button>
  );
}

export function NotificationPanel({ open, onClose }: Props) {
  const router = useRouter();
  const listQ = useNotificationsList(open);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const status = queryStatus(listQ, (data) => data.items.length === 0);

  const openNotification = async (item: NotificationItem) => {
    if (!item.readAt) {
      try {
        await markRead.mutateAsync(item.id);
      } catch {
        /* still navigate — read state will refresh on next poll */
      }
    }
    onClose();
    if (item.link?.trim()) {
      router.push(item.link);
    }
  };

  if (!open) return null;

  const unreadCount = listQ.data?.unreadCount ?? 0;
  const busy = markRead.isPending || markAllRead.isPending;

  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-lg border border-border bg-card shadow-lg"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unreadCount > 0 ? (
            <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void markAllRead.mutateAsync()}
            className="shrink-0 text-xs font-medium text-brand hover:underline disabled:opacity-50"
          >
            Mark all as read
          </button>
        ) : null}
      </div>

      <div className="max-h-[min(24rem,70vh)] overflow-y-auto p-1">
        <AsyncContent
          status={status}
          isFetching={listQ.isFetching && !listQ.isPending}
          loading={
            <div className="flex items-center justify-center py-10">
              <Spinner size="md" />
            </div>
          }
          error={
            <div className="p-2">
              <ErrorState
                message={listQ.error instanceof Error ? listQ.error.message : "Could not load notifications"}
                onRetry={() => void listQ.refetch()}
              />
            </div>
          }
          empty={
            <EmptyState
              title="No new notifications found"
              description="Nothing needs your attention right now."
              icon={Bell}
            />
          }
        >
          <ul className="space-y-0.5">
            {listQ.data?.items.map((item) => (
              <li key={item.id}>
                <NotificationRow item={item} onOpen={(row) => void openNotification(row)} disabled={busy} />
              </li>
            ))}
          </ul>
        </AsyncContent>
      </div>
    </div>
  );
}
