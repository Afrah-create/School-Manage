"use client";

import type { TeacherWeekView } from "@uganda-cbc-sms/shared";
import { classDisplayName } from "@/lib/academicLevel";

const DAY_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function TeacherWeekTimetable({ week }: { week: TeacherWeekView | undefined }) {
  if (!week) {
    return <p className="text-sm text-muted-foreground">Loading timetable…</p>;
  }

  if (week.lessons.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        No published timetable for the current term yet. Your administrator will publish it when ready.
      </p>
    );
  }

  const byDay = new Map<number, typeof week.lessons>();
  for (const lesson of week.lessons) {
    const list = byDay.get(lesson.dayOfWeek) ?? [];
    list.push(lesson);
    byDay.set(lesson.dayOfWeek, list);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Week {week.weekStart} – {week.weekEnd}
        {week.templatesUsed.length
          ? ` · Published v${week.templatesUsed.map((t) => t.version).join(", v")}`
          : null}
      </p>
      <div className="grid gap-4 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((day) => {
          const lessons = (byDay.get(day) ?? []).sort((a, b) => a.periodNumber - b.periodNumber);
          return (
            <div key={day} className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-foreground">{DAY_LABELS[day]}</h3>
              {lessons.length === 0 ? (
                <p className="text-xs text-muted-foreground">No lessons</p>
              ) : (
                <ul className="space-y-2">
                  {lessons.map((l) => (
                    <li
                      key={`${l.date}-${l.periodId}-${l.classId}-${l.subjectId}`}
                      className="rounded-md border border-border bg-muted/20 px-2 py-2 text-xs"
                    >
                      <div className="font-medium text-foreground">
                        {l.startTime}–{l.endTime}
                      </div>
                      <div className="mt-1 font-semibold text-brand">{l.subjectCode}</div>
                      <div className="text-muted-foreground">{l.subjectName}</div>
                      <div className="mt-1 text-foreground">
                        {classDisplayName({ name: l.className, stream: l.classStream })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
