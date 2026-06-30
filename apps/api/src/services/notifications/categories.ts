/** Preference categories wired in v1 event hooks. */
export const NOTIFICATION_CATEGORIES = [
  "assessment_submitted",
  "exam_opened",
  "exam_marks_submitted",
  "exam_ready_to_close",
  "exam_closed",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  assessment_submitted: "Term assessment submitted",
  exam_opened: "Exam opened for marking",
  exam_marks_submitted: "Exam marks submitted",
  exam_ready_to_close: "Exam ready to close",
  exam_closed: "Exam closed",
};

export function isNotificationCategory(value: string): value is NotificationCategory {
  return (NOTIFICATION_CATEGORIES as readonly string[]).includes(value);
}
