export const REPORT_PAYLOAD_VERSION = 1;

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
};

export type ReportTrack = "cbc" | "alevel";
