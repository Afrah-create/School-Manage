import type { NotificationCategory } from "./categories.js";

export type ExamNotificationRecipient = {
  userId: string;
  role: string;
};

export function examDetailLinkForRole(role: string, examId: string): string {
  switch (role) {
    case "class_teacher":
      return `/class-teacher/exams/${examId}`;
    case "subject_teacher":
      return `/subject-teacher/exams/${examId}`;
    case "headteacher":
      return `/headteacher/exams/${examId}`;
    case "admin":
    default:
      return `/admin/exams/${examId}`;
  }
}

export function isTeachingRole(role: string): boolean {
  return role === "subject_teacher" || role === "class_teacher";
}

export function categoryFromType(type: string): NotificationCategory | null {
  const known: NotificationCategory[] = [
    "assessment_submitted",
    "exam_marks_submitted",
    "exam_opened",
    "exam_ready_to_close",
    "exam_closed",
  ];
  return known.includes(type as NotificationCategory) ? (type as NotificationCategory) : null;
}
