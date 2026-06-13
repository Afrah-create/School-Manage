/** Default Uganda secondary school structure templates. */

export type StructureClassTemplate = {
  name: string;
  stream: string;
  level: "O_LEVEL" | "A_LEVEL";
  curriculumTrack?: "SCIENCES" | "ARTS" | "GENERAL" | null;
};

export type TermTemplate = {
  termNumber: 1 | 2 | 3;
  /** Month offset from year startDate (0-based months). */
  startMonthOffset: number;
  durationMonths: number;
};

export const UGANDA_3_TERMS: TermTemplate[] = [
  { termNumber: 1, startMonthOffset: 0, durationMonths: 4 },
  { termNumber: 2, startMonthOffset: 4, durationMonths: 4 },
  { termNumber: 3, startMonthOffset: 8, durationMonths: 4 },
];

export function buildOLevelClasses(streams: string[] = ["Main"]): StructureClassTemplate[] {
  const classes: StructureClassTemplate[] = [];
  for (const form of ["S1", "S2", "S3", "S4"]) {
    for (const stream of streams) {
      classes.push({ name: form, stream, level: "O_LEVEL" });
    }
  }
  return classes;
}

export function buildALevelClasses(streams: string[] = ["Main"]): StructureClassTemplate[] {
  const classes: StructureClassTemplate[] = [];
  for (const form of ["S5", "S6"]) {
    for (const stream of streams) {
      classes.push({ name: form, stream, level: "A_LEVEL", curriculumTrack: "SCIENCES" });
      classes.push({
        name: form,
        stream: stream === "Main" ? "Arts" : `${stream} Arts`,
        level: "A_LEVEL",
        curriculumTrack: "ARTS",
      });
    }
  }
  return classes;
}
