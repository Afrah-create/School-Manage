import validator from "validator";

const STUDENT_NUMBER_RE = /^SMS-\d{4}-\d{5}$/;
const MAX_UGX = 50_000_000;

export function isValidStudentNumber(value: string): boolean {
  return STUDENT_NUMBER_RE.test(value.trim());
}

export function isValidEmail(value: string): boolean {
  return validator.isEmail(value);
}

export function isValidUgxAmount(value: unknown): boolean {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n) || !Number.isInteger(n)) return false;
  return n > 0 && n <= MAX_UGX;
}

export function isValidAlevelScore(value: unknown): boolean {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isInteger(n) && n >= 0 && n <= 100;
}

const CBC_RATINGS = new Set(["A", "B", "C", "D"]);

export function isValidCbcRating(value: unknown): boolean {
  return typeof value === "string" && CBC_RATINGS.has(value.toUpperCase());
}
