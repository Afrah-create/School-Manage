"use client";

import Link from "next/link";
import { ArrowRight, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Spinner } from "@/components/feedback/Spinner";
import { NotificationCard } from "@/components/notifications/NotificationCard";
import type { NotificationItem } from "@/lib/notifications";
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
        /* still navigate */
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
      className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(100vw-2rem,24rem)] overflow-hidden rounded-lg border border-border bg-card shadow-lg"
    >
      <div className="border-b border-border bg-muted/40 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void markAllRead.mutateAsync()}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-brand transition-ui hover:bg-accent disabled:opacity-50"
            >
              Mark all read
            </button>
          ) : null}
        </div>
      </div>

      <div className="max-h-[min(26rem,70vh)] overflow-y-auto bg-card p-2">
        <AsyncContent
          status={status}
          isFetching={listQ.isFetching && !listQ.isPending}
          loading={
            <div className="flex items-center justify-center py-12">
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
              title="No notifications yet"
              description="When exams open or teachers submit marks, updates will appear here."
              icon={Bell}
            />
          }
        >
          <ul className="space-y-1">
            {listQ.data?.items.map((item) => (
              <li key={item.id}>
                <NotificationCard
                  item={item}
                  variant="compact"
                  onOpen={() => void openNotification(item)}
                  disabled={busy}
                />
              </li>
            ))}
          </ul>
        </AsyncContent>
      </div>

      <div className="border-t border-border bg-muted/30 px-3 py-2">
        <Link
          href="/profile/notifications"
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-brand transition-ui hover:bg-accent"
        >
          View all notifications
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
