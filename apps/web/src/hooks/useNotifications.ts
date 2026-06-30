"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch } from "@/lib/api";
import type {
  NotificationItem,
  NotificationListView,
  NotificationPreference,
  NotificationsListData,
} from "@/lib/notifications";
import { NOTIFICATIONS_POLL_MS, NOTIFICATIONS_STALE_MS, queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/store/authStore";

function tenantSlugFromAuth(): string {
  return useAuthStore.getState().tenantSlug ?? "default";
}

function notificationsListKey(tenantSlug: string, view: NotificationListView, page: number, unreadOnly?: boolean) {
  return [...queryKeys.notificationsList(tenantSlug), view, page, unreadOnly ?? false] as const;
}

function invalidateNotificationQueries(qc: ReturnType<typeof useQueryClient>) {
  const slug = tenantSlugFromAuth();
  void qc.invalidateQueries({ queryKey: ["notifications", slug] });
  void qc.invalidateQueries({ queryKey: queryKeys.notificationUnreadCount(slug) });
  void qc.invalidateQueries({ queryKey: queryKeys.notificationsList(slug) });
}

export function useNotificationUnreadCount() {
  const tenantSlug = useAuthStore((s) => s.tenantSlug) ?? "default";
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.notificationUnreadCount(tenantSlug),
    queryFn: async () => {
      const data = await apiGet<NotificationsListData>("/notifications?unread=true&limit=1&view=active");
      return data.unreadCount;
    },
    enabled: isAuthenticated,
    staleTime: NOTIFICATIONS_STALE_MS,
    refetchInterval: NOTIFICATIONS_POLL_MS,
  });
}

export function useNotificationsList(open: boolean) {
  const tenantSlug = useAuthStore((s) => s.tenantSlug) ?? "default";
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: notificationsListKey(tenantSlug, "active", 1, false),
    queryFn: () => apiGet<NotificationsListData>("/notifications?limit=20&view=active"),
    enabled: isAuthenticated && open,
    staleTime: NOTIFICATIONS_STALE_MS,
    refetchInterval: open ? NOTIFICATIONS_POLL_MS : false,
    placeholderData: (prev) => prev,
  });
}

export function useNotificationsInbox(params: {
  view: NotificationListView;
  page: number;
  limit?: number;
  unreadOnly?: boolean;
}) {
  const tenantSlug = useAuthStore((s) => s.tenantSlug) ?? "default";
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const limit = params.limit ?? 25;

  return useQuery({
    queryKey: notificationsListKey(tenantSlug, params.view, params.page, params.unreadOnly),
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        limit: String(limit),
        view: params.view,
      });
      if (params.unreadOnly) qs.set("unread", "true");
      return apiGet<NotificationsListData>(`/notifications?${qs.toString()}`);
    },
    enabled: isAuthenticated,
    staleTime: NOTIFICATIONS_STALE_MS,
    placeholderData: (prev) => prev,
  });
}

export function useNotificationPreferences() {
  const tenantSlug = useAuthStore((s) => s.tenantSlug) ?? "default";
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.notificationPreferences(tenantSlug),
    queryFn: () => apiGet<NotificationPreference[]>("/notifications/preferences"),
    enabled: isAuthenticated,
    staleTime: NOTIFICATIONS_STALE_MS,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiPatch<NotificationItem>(`/notifications/${id}/read`),
    onSuccess: () => invalidateNotificationQueries(qc),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => apiPatch<{ updated: number }>("/notifications/read-all"),
    onSuccess: () => invalidateNotificationQueries(qc),
  });
}

export function useArchiveNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiPatch<NotificationItem>(`/notifications/${id}/archive`),
    onSuccess: () => invalidateNotificationQueries(qc),
  });
}

export function useUnarchiveNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiPatch<NotificationItem>(`/notifications/${id}/unarchive`),
    onSuccess: () => invalidateNotificationQueries(qc),
  });
}

export function useArchiveNotificationsBulk() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => apiPatch<{ archived: number }>("/notifications/archive", { ids }),
    onSuccess: () => invalidateNotificationQueries(qc),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDelete<{ deleted: boolean }>(`/notifications/${id}`),
    onSuccess: () => invalidateNotificationQueries(qc),
  });
}

export function useDeleteNotificationsBulk() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => apiDelete<{ deleted: number }>("/notifications/bulk", { ids }),
    onSuccess: () => invalidateNotificationQueries(qc),
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  const tenantSlug = useAuthStore((s) => s.tenantSlug) ?? "default";

  return useMutation({
    mutationFn: (preferences: Array<{
      category: string;
      emailEnabled?: boolean;
      inAppEnabled?: boolean;
    }>) => apiPatch<NotificationPreference[]>("/notifications/preferences", { preferences }),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.notificationPreferences(tenantSlug), data);
    },
  });
}
