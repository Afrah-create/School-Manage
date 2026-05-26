export const REPORT_PAYLOAD_VERSION = 1;

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

export type CbcReportSubjectLine = {
  name: string;
  code: string;
  strand: string;
  competency: string;
  rating: string;
  descriptor: string;
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
  subjects: CbcReportSubjectLine[];
  daysAttended: number;
  totalDays: number;
  teacherComment: string;
  headteacherComment: string;
  /** Present when generated with a linked formal exam (CBC annex). */
  formalExam?: ReportFormalExamSection;
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
  subjects: AlevelReportSubjectLine[];
  totalPoints: number;
  division: string;
  teacherComment: string;
  headteacherRemark: string;
  /** Set when report scores were compiled from a formal exam. */
  sourceExamId?: string;
  sourceExamName?: string;
};

export type ReportTrack = "cbc" | "alevel";
