"use client";

import type { RankingMethod, ReportRankingSnapshot } from "@uganda-cbc-sms/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";

export type SubjectSubmissionTrack = {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string | null;
  teacherName: string | null;
  teacherEmail: string | null;
  activeStudents: number;
  studentsWithMarks: number;
  studentsSubmitted: number;
  status: "not_started" | "in_progress" | "submitted";
  lastSubmittedAt: string | null;
};

export type ReportExamOption = {
  id: string;
  name: string;
  status: string;
  examDate: string | null;
  maxScore: number;
  subjectCount: number;
  allSubjectsSubmitted: boolean;
  readyForReports: boolean;
  isDefault: boolean;
};

export type ExamSubjectTrack = {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  isCompulsory?: boolean;
  entrantsCount?: number;
  studentsWithMarks: number;
  activeStudents: number;
  isSubmitted: boolean;
  status: "not_started" | "in_progress" | "submitted" | "not_applicable";
};

export type ProjectWorkSubmissionTrack = {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string | null;
  teacherName: string | null;
  teacherEmail: string | null;
  projectWorkRequired: boolean;
  projectsExpected: number;
  activeStudents: number;
  studentsWithProjects: number;
  studentsMeetingExpected: number;
  status: "not_required" | "not_started" | "in_progress" | "submitted";
};

export type ReportReadiness = {
  track: "cbc" | "alevel";
  classLevel: string;
  className: string;
  termNumber: number;
  activeStudents: number;
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    status: string;
  }>;
  subjectTracking: SubjectSubmissionTrack[];
  /** Full class timetable tracking when term list is narrowed for a linked exam. */
  allSubjectTracking?: SubjectSubmissionTrack[];
  submittedCount: number;
  pendingCount: number;
  totalSubjects: number;
  /** Exam papers on the linked formal exam; term exam entry not required for those subjects. */
  examPaperSubjectCount?: number;
  ready: boolean;
  pendingSubjectCodes: string[];
  teachersPending: Array<{
    teacherId: string | null;
    teacherName: string;
    teacherEmail: string | null;
    subjects: string[];
  }>;
  examOptions: ReportExamOption[];
  examTracking?: ExamSubjectTrack[];
  examReady?: boolean;
  linkedExamId?: string | null;
  examLinkInvalid?: boolean;
  examNotClosed?: boolean;
  termReady?: boolean;
  defaultExamId?: string | null;
  defaultExamName?: string | null;
  clearedStaleDefault?: boolean;
  projectWorkTracking?: ProjectWorkSubmissionTrack[];
  projectWorkPendingCount?: number;
  projectWorkReady?: boolean;
};

export type ClassReportRow = {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  isApproved: boolean;
  computedAt: string | null;
  division?: string | null;
  totalPoints?: number | null;
  certificationLabel?: string | null;
  examLinkStatus?: ReportExamLinkStatus;
  reportSourceType?: "term" | "exam" | null;
  reportSourceLabel?: string;
  payloadGeneratedAt?: string | null;
  ranking?: ReportRankingSnapshot | null;
  rankingLabel?: string | null;
  aggregateLabel?: string | null;
};

export type ClassRankingsResponse = {
  track: "cbc" | "alevel";
  classSize: number;
  method: RankingMethod | null;
  leaderboard: ClassReportRow[];
};

export type GenerateReportsResult = {
  track: "cbc" | "alevel";
  reportIds: string[];
  count: number;
  warnings: string[];
  skipped: number;
  sourceType?: "term" | "exam";
  sourceExamId?: string | null;
  sourceExamName?: string | null;
  usedTermAssessmentsFallback?: boolean;
};

export type ReportExamLinkStatus = "none" | "active" | "deleted";

export function useReportExamOptions(classId: string | undefined, termId: string | undefined) {
  return useQuery({
    queryKey: ["reports-exam-options", classId, termId],
    queryFn: () =>
      apiGet<ReportExamOption[]>(
        `/reports/exam-options?classId=${encodeURIComponent(classId!)}&termId=${encodeURIComponent(termId!)}`,
      ),
    enabled: Boolean(classId && termId),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });
}

export function useReportReadiness(
  classId: string | undefined,
  termId: string | undefined,
  examId?: string,
) {
  return useQuery({
    queryKey: ["reports-readiness", classId, termId, examId ?? ""],
    queryFn: () => {
      const qp = new URLSearchParams({
        classId: classId!,
        termId: termId!,
      });
      if (examId) qp.set("examId", examId);
      return apiGet<ReportReadiness>(`/reports/readiness?${qp.toString()}`);
    },
    enabled: Boolean(classId && termId),
  });
}

export function useClassReports(classId: string | undefined, termId: string | undefined) {
  return useQuery({
    queryKey: ["reports-list", classId, termId],
    queryFn: () =>
      apiGet<{ track: "cbc" | "alevel"; reports: ClassReportRow[] }>(
        `/reports/list?classId=${encodeURIComponent(classId!)}&termId=${encodeURIComponent(termId!)}`,
      ),
    enabled: Boolean(classId && termId),
  });
}

export function useClassRankings(classId: string | undefined, termId: string | undefined) {
  return useQuery({
    queryKey: ["reports-class-rankings", classId, termId],
    queryFn: () =>
      apiGet<ClassRankingsResponse>(
        `/reports/class-rankings?classId=${encodeURIComponent(classId!)}&termId=${encodeURIComponent(termId!)}`,
      ),
    enabled: Boolean(classId && termId),
  });
}

export function useReportActions() {
  const qc = useQueryClient();
  const invalidate = async (classId?: string, termId?: string) => {
    await qc.invalidateQueries({ queryKey: ["reports-exam-options"] });
    await qc.invalidateQueries({ queryKey: ["reports-readiness"] });
    await qc.invalidateQueries({ queryKey: ["reports-list"] });
    await qc.invalidateQueries({ queryKey: ["reports-class-rankings"] });
    await qc.invalidateQueries({ queryKey: ["reports-analytics"] });
    await qc.invalidateQueries({ queryKey: ["reports-overview"] });
    if (classId && termId) {
      await qc.invalidateQueries({ queryKey: ["reports-readiness", classId, termId] });
      await qc.invalidateQueries({ queryKey: ["reports-list", classId, termId] });
    }
  };

  const generate = useMutation({
    mutationFn: (body: { classId: string; termId: string; examId?: string }) =>
      apiPost<GenerateReportsResult>("/reports/generate", body),
    onSuccess: (_d, vars) => void invalidate(vars.classId, vars.termId),
  });

  const regenerate = useMutation({
    mutationFn: (body: { classId: string; termId: string; examId?: string }) =>
      apiPost<GenerateReportsResult>("/reports/regenerate", body),
    onSuccess: (_d, vars) => void invalidate(vars.classId, vars.termId),
  });

  const setTermDefault = useMutation({
    mutationFn: (body: { classId: string; termId: string; examId: string | null }) =>
      apiPut<{ examId: string | null; examName: string | null }>("/reports/term-default", body),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["reports-exam-options", vars.classId, vars.termId] });
      void qc.invalidateQueries({ queryKey: ["reports-readiness"] });
      void qc.invalidateQueries({ queryKey: ["reports-term-default", vars.classId, vars.termId] });
    },
  });

  const approve = useMutation({
    mutationFn: (reportId: string) => apiPatch<{ type: string }>(`/reports/${reportId}/approve`, {}),
    onSuccess: () => void invalidate(),
  });

  return { generate, regenerate, setTermDefault, approve, invalidate };
}
