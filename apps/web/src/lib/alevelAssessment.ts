/** Normalize A-Level assessment rows from the API (snake_case or camelCase). */
export function parseAlevelAssessmentRows(rows: unknown[] | undefined): {
  scoresByStudent: Record<string, string>;
  submitted: boolean;
} {
  const scoresByStudent: Record<string, string> = {};
  const parsed: Array<{ submitted: boolean }> = [];

  for (const raw of rows ?? []) {
    const r = raw as Record<string, unknown>;
    const studentId = String(r.student_id ?? r.studentId ?? "");
    if (!studentId) continue;
    const score = r.score;
    if (score != null && score !== "") {
      scoresByStudent[studentId] = String(score);
    }
    parsed.push({
      submitted: r.is_submitted === true || r.isSubmitted === true,
    });
  }

  return {
    scoresByStudent,
    submitted: parsed.length > 0 && parsed.every((r) => r.submitted),
  };
}
