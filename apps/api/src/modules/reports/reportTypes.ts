import type { ReportRankingSnapshot } from "@uganda-cbc-sms/shared";

export const REPORT_PAYLOAD_VERSION = 2;

export type { ReportRankingSnapshot };

export type ReportSourceType = "term" | "exam";

export type ReportFormalExamLine = {
  name: string;
  code: string;
  score: number;
  grade: string;
  points: number | null;
  maxScore: number;
};

export type ReportFormalExamSection = {
  examId: string;
  examName: string;
  maxScore: number;
  subjects: ReportFormalExamLine[];
};

export type TermReportExamColumn = {
  examId: string;
  name: string;
  examDate: string | null;
};

export type TermReportSubjectRow = {
  code: string;
  name: string;
  examScores: Array<number | null>;
  examAverage: number | null;
  projectAverage: number | null;
  projectsCompleted: number | null;
  projectsExpected: number | null;
  includeProjectWork: boolean;
  average: number | null;
  finalGrade: string | null;
  descriptor: string;
  teacherInitial: string | null;
};

export type GradingScaleLegendRow = {
  minScore: number;
  maxScore: number;
  grade: string;
  descriptor: string;
};

export type CbcReportSubjectLine = {
  name: string;
  code: string;
  strand: string;
  competency: string;
  rating: string;
  descriptor: string;
};

export type CbcReportSubjectSummary = {
  code: string;
  name: string;
  finalGrade: string | null;
  caScore: number | null;
  eocScore: number | null;
  composite: number | null;
  projectStatus: string | null;
  caSource?: string | null;
  caSourceLabel?: string | null;
  projectsCompleted?: number | null;
  projectsExpected?: number | null;
};

export type CbcReportCertification = {
  resultCode: string;
  label: string;
  reasonCodes: string[];
  reasonLabels: string[];
};

export type CbcReportPayload = {
  version: typeof REPORT_PAYLOAD_VERSION;
  schoolName: string;
  studentName: string;
  studentNumber: string;
  className: string;
  stream: string;
  termLabel: string;
  yearName: string;
  photoUrl: string | null;
  /** @deprecated Strand competency lines — empty in exam-centric reports. */
  subjects: CbcReportSubjectLine[];
  /** Term subject grid: C1..Cn, average, grade. */
  examColumns?: TermReportExamColumn[];
  termSubjectRows?: TermReportSubjectRow[];
  overallTotal?: number | null;
  overallAverage?: number | null;
  gradingScaleLegend?: GradingScaleLegendRow[];
  /** @deprecated Legacy year-level summaries. */
  subjectSummaries?: CbcReportSubjectSummary[];
  /** @deprecated UCE certification — not used for internal term reports. */
  certification?: CbcReportCertification;
  daysAttended: number;
  totalDays: number;
  teacherComment: string;
  headteacherComment: string;
  /** Class position after batch report generation (competition ranking). */
  ranking?: ReportRankingSnapshot;
  /** Present when generated with a linked formal exam (CBC annex). */
  formalExam?: ReportFormalExamSection;
  /** Snapshot metadata — set at generation time. */
  sourceType?: ReportSourceType;
  sourceExamId?: string;
  sourceExamName?: string;
  generatedAt?: string;
};

export type AlevelReportSubjectLine = {
  name: string;
  code: string;
  score: number;
  grade: string;
  points: number;
};

export type AlevelReportPayload = {
  version: typeof REPORT_PAYLOAD_VERSION;
  schoolName: string;
  studentName: string;
  studentNumber: string;
  className: string;
  combination: string;
  termLabel: string;
  yearName: string;
  photoUrl?: string | null;
  subjects: AlevelReportSubjectLine[];
  totalPoints: number;
  division: string;
  teacherComment: string;
  headteacherRemark: string;
  ranking?: ReportRankingSnapshot;
  sourceType?: ReportSourceType;
  /** Set when report scores were compiled from a formal exam. */
  sourceExamId?: string;
  sourceExamName?: string;
  generatedAt?: string;
};

export type ReportTrack = "cbc" | "alevel";
