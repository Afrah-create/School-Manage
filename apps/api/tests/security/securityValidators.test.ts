import {
  isValidAlevelScore,
  isValidEmail,
  isValidStudentNumber,
  isValidUgxAmount,
} from "../../src/utils/securityValidators.js";

describe("securityValidators", () => {
  it("validates student numbers", () => {
    expect(isValidStudentNumber("SMS-2026-00001")).toBe(true);
    expect(isValidStudentNumber("SMS-26-1")).toBe(false);
  });

  it("validates UGX amounts", () => {
    expect(isValidUgxAmount(1000)).toBe(true);
    expect(isValidUgxAmount(0)).toBe(false);
    expect(isValidUgxAmount(50_000_001)).toBe(false);
  });

  it("validates A-Level scores", () => {
    expect(isValidAlevelScore(0)).toBe(true);
    expect(isValidAlevelScore(100)).toBe(true);
    expect(isValidAlevelScore(101)).toBe(false);
  });

  it("validates emails", () => {
    expect(isValidEmail("user@school.ug")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
  });
});
