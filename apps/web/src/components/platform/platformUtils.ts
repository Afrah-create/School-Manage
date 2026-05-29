export function platformApiError(err: unknown): string | null {
  if (err && typeof err === "object" && "response" in err) {
    const data = (err as { response?: { data?: { error?: string } } }).response?.data;
    return typeof data?.error === "string" ? data.error : null;
  }
  return null;
}

export const FEATURE_FLAG_LABELS: Record<string, string> = {
  fees: "Fees & billing",
  exams: "Exams",
  alevel: "A-Level assessments",
  timetable: "Timetable",
  attendance: "Attendance",
  analytics: "Analytics",
};

export function formatAuditAction(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
