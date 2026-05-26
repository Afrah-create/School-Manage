import type { SchoolClass, Subject } from "@uganda-cbc-sms/shared";

export type AcademicLevel = "O_LEVEL" | "A_LEVEL";

export const ACADEMIC_LEVELS: AcademicLevel[] = ["O_LEVEL", "A_LEVEL"];

export function levelLabel(level: AcademicLevel | string): string {
  return level === "A_LEVEL" ? "A-Level (UNEB)" : "O-Level (CBC)";
}

export function levelShortLabel(level: AcademicLevel | string): string {
  return level === "A_LEVEL" ? "A-Level" : "O-Level";
}

export function parseAcademicLevel(raw: string | null | undefined): AcademicLevel {
  return raw === "A_LEVEL" ? "A_LEVEL" : "O_LEVEL";
}

export function filterClassesByLevel(classes: SchoolClass[], level: AcademicLevel, yearId?: string) {
  return classes.filter(
    (c) => c.level === level && (!yearId || c.academicYearId === yearId),
  );
}

export function filterSubjectsByLevel(subjects: Subject[], level: AcademicLevel) {
  return subjects.filter((s) => s.level === level);
}

export function classDisplayName(c: Pick<SchoolClass, "name" | "stream">): string {
  return c.stream ? `${c.name} · ${c.stream}` : c.name;
}
