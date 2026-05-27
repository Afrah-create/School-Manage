import type {
  TimetableClassSubjectOption,
  TimetablePeriod,
  TimetableSlotOccupancyView,
} from "@uganda-cbc-sms/shared";
import { classDisplayName } from "@/lib/academicLevel";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function slotKey(dayOfWeek: number, periodId: string): string {
  return `${dayOfWeek}:${periodId}`;
}

export function formatSlotLabel(
  dayOfWeek: number,
  periodId: string,
  periods: TimetablePeriod[],
): string {
  const day = DAY_NAMES[dayOfWeek] ?? `Day ${dayOfWeek}`;
  const period = periods.find((p) => p.id === periodId);
  if (!period) return day;
  return `${day}, ${period.label} (${period.startTime}–${period.endTime})`;
}

export function getAssignmentConflict(
  slotKeyValue: string,
  classSubjectId: string,
  draft: Record<string, string>,
  slotOptions: TimetableClassSubjectOption[],
  occupancy: TimetableSlotOccupancyView | undefined,
  periods: TimetablePeriod[],
): string | null {
  if (!classSubjectId) return null;

  const option = slotOptions.find((o) => o.classSubjectId === classSubjectId);
  if (!option) return null;

  if (!option.teacherId) {
    return "Assign a subject teacher before scheduling this subject.";
  }

  const [dayStr, periodId] = slotKeyValue.split(":");
  const dayOfWeek = Number(dayStr);

  const occupants = occupancy?.bySlot[slotKeyValue] ?? [];
  for (const hit of occupants) {
    if (hit.teacherId && hit.teacherId === option.teacherId) {
      const otherClass = classDisplayName({ name: hit.className, stream: hit.classStream });
      const slot = formatSlotLabel(dayOfWeek, periodId, periods);
      return `${option.teacherName ?? "Teacher"} already teaches ${otherClass} (${hit.subjectCode}) on ${slot}.`;
    }
  }

  return null;
}

export function countDraftConflicts(
  draft: Record<string, string>,
  slotOptions: TimetableClassSubjectOption[],
  occupancy: TimetableSlotOccupancyView | undefined,
  periods: TimetablePeriod[],
): number {
  let n = 0;
  for (const [key, classSubjectId] of Object.entries(draft)) {
    if (!classSubjectId) continue;
    if (getAssignmentConflict(key, classSubjectId, draft, slotOptions, occupancy, periods)) n += 1;
  }
  return n;
}
