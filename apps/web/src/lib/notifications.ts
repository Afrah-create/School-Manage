export type NotificationItem = {
  id: string;
  userId: string;
  tenantId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type NotificationListView = "active" | "archived" | "all";

export type NotificationsListData = {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
};

export type NotificationPreference = {
  category: string;
  label: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
};

export function snippetText(text: string, max = 96): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
