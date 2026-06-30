"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, Bell, Check, ExternalLink, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Spinner } from "@/components/feedback/Spinner";
import { NotificationCard } from "@/components/notifications/NotificationCard";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { NotificationItem, NotificationListView } from "@/lib/notifications";
import { queryStatus } from "@/lib/queryStatus";
import {
  useArchiveNotification,
  useArchiveNotificationsBulk,
  useDeleteNotification,
  useDeleteNotificationsBulk,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsInbox,
  useUnarchiveNotification,
} from "@/hooks/useNotifications";
import { useMemo, useState } from "react";

const TABS: Array<{ id: NotificationListView; label: string }> = [
  { id: "active", label: "Inbox" },
  { id: "archived", label: "Archived" },
];

type Props = {
  rolePrefix: string;
};

export function NotificationInbox({ rolePrefix }: Props) {
  const router = useRouter();
  const [view, setView] = useState<NotificationListView>("active");
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<"one" | "bulk" | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const listQ = useNotificationsInbox({ view, page, unreadOnly: view === "active" ? unreadOnly : false });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const archiveOne = useArchiveNotification();
  const unarchiveOne = useUnarchiveNotification();
  const archiveBulk = useArchiveNotificationsBulk();
  const deleteOne = useDeleteNotification();
  const deleteBulk = useDeleteNotificationsBulk();

  const status = queryStatus(listQ, (data) => data.items.length === 0);
  const items = listQ.data?.items ?? [];
  const total = listQ.data?.total ?? 0;
  const unreadCount = listQ.data?.unreadCount ?? 0;
  const limit = 25;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const busy =
    markRead.isPending ||
    markAllRead.isPending ||
    archiveOne.isPending ||
    unarchiveOne.isPending ||
    archiveBulk.isPending ||
    deleteOne.isPending ||
    deleteBulk.isPending;

  const selectedIds = useMemo(() => [...selected], [selected]);

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(items.map((i) => i.id)) : new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const openNotification = async (item: NotificationItem) => {
    if (!item.readAt && view === "active") {
      try {
        await markRead.mutateAsync(item.id);
      } catch {
        /* navigate anyway */
      }
    }
    if (item.link?.trim()) {
      router.push(item.link);
    }
  };

  const runDelete = async () => {
    if (confirmDelete === "one" && pendingDeleteId) {
      await deleteOne.mutateAsync(pendingDeleteId);
      setPendingDeleteId(null);
    } else if (confirmDelete === "bulk") {
      await deleteBulk.mutateAsync(selectedIds);
      setSelected(new Set());
    }
    setConfirmDelete(null);
  };

  const rowActions = (item: NotificationItem) => {
    if (view === "active") {
      return (
        <>
          {!item.readAt ? (
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-2.5 text-xs"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                void markRead.mutateAsync(item.id);
              }}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Mark read
            </Button>
          ) : null}
          {item.link ? (
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-2.5 text-xs"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                void openNotification(item);
              }}
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Open
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-2.5 text-xs"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              void archiveOne.mutateAsync(item.id);
            }}
          >
            <Archive className="mr-1 h-3.5 w-3.5" />
            Archive
          </Button>
        </>
      );
    }

    return (
      <>
        <Button
          type="button"
          variant="secondary"
          className="h-8 px-2.5 text-xs"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            void unarchiveOne.mutateAsync(item.id);
          }}
        >
          <ArchiveRestore className="mr-1 h-3.5 w-3.5" />
          Restore
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-8 px-2.5 text-xs text-red-600 hover:text-red-700"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            setPendingDeleteId(item.id);
            setConfirmDelete("one");
          }}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Delete
        </Button>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href={`${rolePrefix}/dashboard`} className="font-medium text-brand hover:underline">
          ← Back to dashboard
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/profile" className="font-medium text-brand hover:underline">
          My profile
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/profile/notifications/settings" className="font-medium text-brand hover:underline">
          Notification settings
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setView(tab.id);
                  setPage(1);
                  setSelected(new Set());
                  setUnreadOnly(false);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-ui ${
                  view === tab.id
                    ? "bg-brand text-white"
                    : "bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.id === "active" && unreadCount > 0 ? (
                  <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">{unreadCount}</span>
                ) : null}
              </button>
            ))}
            {view === "active" ? (
              <button
                type="button"
                onClick={() => {
                  setUnreadOnly((v) => !v);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-ui ${
                  unreadOnly
                    ? "bg-accent text-foreground ring-1 ring-border"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                Unread only
              </button>
            ) : null}
          </div>
          {view === "active" && unreadCount > 0 ? (
            <Button
              type="button"
              variant="secondary"
              className="h-9"
              disabled={busy}
              loading={markAllRead.isPending}
              onClick={() => void markAllRead.mutateAsync()}
            >
              Mark all read
            </Button>
          ) : null}
        </div>

        {items.length > 0 ? (
          <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
              checked={selected.size > 0 && selected.size === items.length}
              onChange={(e) => toggleAll(e.target.checked)}
              aria-label="Select all notifications on this page"
            />
            <span className="text-xs text-muted-foreground">
              {selected.size > 0 ? `${selected.size} selected` : "Select notifications for bulk actions"}
            </span>
          </div>
        ) : null}

        <div className="p-3">
          <AsyncContent
            status={status}
            isFetching={listQ.isFetching && !listQ.isPending}
            loading={
              <div className="flex items-center justify-center py-16">
                <Spinner size="md" />
              </div>
            }
            error={
              <ErrorState
                message={listQ.error instanceof Error ? listQ.error.message : "Could not load notifications"}
                onRetry={() => void listQ.refetch()}
              />
            }
            empty={
              <EmptyState
                title={view === "archived" ? "No archived notifications" : unreadOnly ? "No unread notifications" : "No notifications yet"}
                description={
                  view === "archived"
                    ? "Archived items you remove from your inbox will appear here."
                    : "When exams open or teachers submit marks, updates will appear here."
                }
                icon={Bell}
              />
            }
          >
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <NotificationCard
                    item={item}
                    variant="full"
                    selected={selected.has(item.id)}
                    onSelect={(checked) => toggleOne(item.id, checked)}
                    onOpen={() => void openNotification(item)}
                    disabled={busy}
                    actions={rowActions(item)}
                  />
                </li>
              ))}
            </ul>
          </AsyncContent>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-8"
                disabled={page <= 1 || busy}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-8"
                disabled={page >= totalPages || busy}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {selected.size > 0 ? (
        <div className="sticky bottom-4 z-10 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">
            {selected.size} notification{selected.size === 1 ? "" : "s"} selected
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            {view === "active" ? (
              <Button
                type="button"
                disabled={busy}
                loading={archiveBulk.isPending}
                onClick={() => {
                  void archiveBulk.mutateAsync(selectedIds).then(() => setSelected(new Set()));
                }}
              >
                <Archive className="mr-1 h-4 w-4" />
                Archive selected
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="text-red-600 hover:text-red-700"
                disabled={busy}
                loading={deleteBulk.isPending}
                onClick={() => setConfirmDelete("bulk")}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete permanently
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete != null}
        title="Delete notification permanently?"
        description="This cannot be undone. The notification will be removed from your archive."
        confirmLabel="Delete"
        danger
        loading={deleteOne.isPending || deleteBulk.isPending}
        onCancel={() => {
          setConfirmDelete(null);
          setPendingDeleteId(null);
        }}
        onConfirm={() => void runDelete()}
      />
    </div>
  );
}
