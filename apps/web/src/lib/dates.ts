/** Format API / form values for HTML `<input type="date" />`. */
export function formatDateForInput(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1]!;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return formatDateForInput(parsed);
  return "";
}
