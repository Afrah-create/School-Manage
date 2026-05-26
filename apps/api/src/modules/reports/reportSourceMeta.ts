import type { AlevelReportPayload, CbcReportPayload } from "./reportTypes";

export type ReportSourceType = "term" | "exam";

export type ReportSourceSnapshot = {
  sourceType: ReportSourceType;
  sourceExamId?: string;
  sourceExamName?: string;
  generatedAt: string;
};

export function applyReportSourceMeta<T extends CbcReportPayload | AlevelReportPayload>(
  payload: T,
  source:
    | { type: "term" }
    | { type: "exam"; examId: string; examName: string },
): T & ReportSourceSnapshot {
  const generatedAt = new Date().toISOString();
  if (source.type === "exam") {
    return {
      ...payload,
      sourceType: "exam",
      sourceExamId: source.examId,
      sourceExamName: source.examName,
      generatedAt,
    };
  }
  return {
    ...payload,
    sourceType: "term",
    sourceExamId: undefined,
    sourceExamName: undefined,
    generatedAt,
  };
}

export function reportSourceFromPayload(payload: unknown): {
  sourceType: ReportSourceType | null;
  sourceLabel: string;
  generatedAt: string | null;
} {
  if (!payload || typeof payload !== "object") {
    return { sourceType: null, sourceLabel: "—", generatedAt: null };
  }
  const p = payload as Record<string, unknown>;
  const generatedAt = typeof p.generatedAt === "string" ? p.generatedAt : null;

  if (p.sourceType === "exam" || typeof p.sourceExamId === "string") {
    const name =
      typeof p.sourceExamName === "string"
        ? p.sourceExamName
        : (p.formalExam as { examName?: string } | undefined)?.examName ?? "Formal exam";
    return { sourceType: "exam", sourceLabel: name, generatedAt };
  }

  if (p.sourceType === "term") {
    return { sourceType: "term", sourceLabel: "Term assessments", generatedAt };
  }

  const formal = p.formalExam as { examName?: string } | undefined;
  if (formal?.examName) {
    return { sourceType: "exam", sourceLabel: formal.examName, generatedAt };
  }

  return { sourceType: "term", sourceLabel: "Term assessments", generatedAt };
}
