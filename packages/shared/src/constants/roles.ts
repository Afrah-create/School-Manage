export const ROLES = [
  "admin",
  "headteacher",
  "class_teacher",
  "subject_teacher",
  "bursar",
] as const;

export type Role = (typeof ROLES)[number];

/** Both class and subject teachers may enter marks and attendance; class teachers also lead the homeroom class. */
export const CLASS_AND_SUBJECT_TEACHER_ROLES = ["class_teacher", "subject_teacher"] as const;
