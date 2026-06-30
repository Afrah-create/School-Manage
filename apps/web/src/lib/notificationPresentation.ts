import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CheckCircle2,
  ClipboardPenLine,
  Flag,
  Lock,
  Send,
} from "lucide-react";

export type NotificationStage =
  | "exam_opened"
  | "exam_marks_submitted"
  | "exam_ready_to_close"
  | "exam_closed"
  | "assessment_submitted"
  | "generic";

export type NotificationVisual = {
  stage: NotificationStage;
  label: string;
  Icon: LucideIcon;
  iconWrap: string;
  iconColor: string;
  accentBorder: string;
};

const EXAM_OPENED: NotificationVisual = {
  stage: "exam_opened",
  label: "Exam open",
  Icon: ClipboardPenLine,
  iconWrap: "bg-sky-500/15",
  iconColor: "text-sky-600 dark:text-sky-400",
  accentBorder: "border-l-sky-500",
};

const EXAM_MARKS_SUBMITTED: NotificationVisual = {
  stage: "exam_marks_submitted",
  label: "Marks in",
  Icon: Send,
  iconWrap: "bg-emerald-500/15",
  iconColor: "text-emerald-600 dark:text-emerald-400",
  accentBorder: "border-l-emerald-500",
};

const EXAM_READY: NotificationVisual = {
  stage: "exam_ready_to_close",
  label: "Ready to close",
  Icon: Flag,
  iconWrap: "bg-amber-500/15",
  iconColor: "text-amber-600 dark:text-amber-400",
  accentBorder: "border-l-amber-500",
};

const EXAM_CLOSED: NotificationVisual = {
  stage: "exam_closed",
  label: "Exam closed",
  Icon: Lock,
  iconWrap: "bg-violet-500/15",
  iconColor: "text-violet-600 dark:text-violet-400",
  accentBorder: "border-l-violet-500",
};

const ASSESSMENT_SUBMITTED: NotificationVisual = {
  stage: "assessment_submitted",
  label: "Assessment",
  Icon: CheckCircle2,
  iconWrap: "bg-brand/15",
  iconColor: "text-brand",
  accentBorder: "border-l-brand",
};

const GENERIC: NotificationVisual = {
  stage: "generic",
  label: "Update",
  Icon: Bell,
  iconWrap: "bg-muted",
  iconColor: "text-muted-foreground",
  accentBorder: "border-l-border",
};

const BY_TYPE: Record<string, NotificationVisual> = {
  exam_opened: EXAM_OPENED,
  exam_marks_submitted: EXAM_MARKS_SUBMITTED,
  exam_ready_to_close: EXAM_READY,
  exam_closed: EXAM_CLOSED,
  assessment_submitted: ASSESSMENT_SUBMITTED,
};

export function notificationVisual(
  type: string,
  metadata?: Record<string, unknown> | null,
): NotificationVisual {
  const stage = typeof metadata?.stage === "string" ? metadata.stage : type;
  return BY_TYPE[stage] ?? BY_TYPE[type] ?? GENERIC;
}

export function notificationExamName(metadata?: Record<string, unknown> | null): string | null {
  const name = metadata?.examName;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function notificationSubjectCode(metadata?: Record<string, unknown> | null): string | null {
  const code = metadata?.subjectCode;
  return typeof code === "string" && code.trim() ? code.trim() : null;
}
