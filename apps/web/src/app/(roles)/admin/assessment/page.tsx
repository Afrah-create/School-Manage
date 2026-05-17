"use client";

import type { AcademicYear, SchoolClass, Subject, Student, Term } from "@uganda-cbc-sms/shared";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ReadOnlyAlevelScoresTable,
  ReadOnlyCbcRatingsTable,
  ReadOnlyProjectAssessmentsTable,
} from "@/components/assessment/AdminAssessmentDataTables";
import { AssessmentFilters } from "@/components/assessment/AssessmentFilters";
import { ALevelComments } from "@/components/assessment/ALevelComments";
import { ALevelDivisionSummary } from "@/components/assessment/ALevelDivisionSummary";
import { ALevelScoreGrid } from "@/components/assessment/ALevelScoreGrid";
import { AssessmentStatusOverview } from "@/components/assessment/AssessmentStatusOverview";
import { CBCComments } from "@/components/assessment/CBCComments";
import { CBCProjectAssessment } from "@/components/assessment/CBCProjectAssessment";
import { CbcAssessmentGrid } from "@/components/assessment/CbcAssessmentGrid";
import { SubmitLockBanner } from "@/components/assessment/SubmitLockBanner";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  useAlevelActions,
  useAlevelAssessments,
  useAlevelComments,
  useAlevelDivision,
  useAlevelStatus,
} from "@/hooks/useALevelAssessment";
import { useGradingScales } from "@/hooks/useGradingScales";
import { useCbcActions, useCbcAssessments, useCbcComments, useCbcProjects, useCbcStatus } from "@/hooks/useCBCAssessment";
import { apiGet } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const CONTEXT_STORAGE_KEY = "sms-admin-assessment-context-v1";

type PersistedContext = {
  tab?: "cbc" | "alevel";
  yearId?: string;
  termId?: string;
  classId?: string;
  subjectId?: string;
  combinationId?: string;
};

type ClassSubjectRow = { subjectId: string; subjectName: string; subjectCode: string };

type ComboRow = {
  id: string;
  code: string;
  name: string;
  subjects: Array<{ id: string; code: string; name: string }>;
};

function asRecordRows(data: unknown[] | undefined): Record<string, unknown>[] {
  return (data ?? []).map((r) => r as Record<string, unknown>);
}

export default function AdminAssessmentPage() {
  const role = useAuthStore((s) => s.user?.role ?? "admin");
  const isAdminOversight = role === "admin";

  const [tab, setTab] = useState<"cbc" | "alevel">("cbc");
  const [unsaved, setUnsaved] = useState<{ cbc: boolean; alevel: boolean }>({ cbc: false, alevel: false });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    yearId: "",
    termId: "",
    classId: "",
    subjectId: "",
    combinationId: "",
  });

  const bootstrapDone = useRef(false);

  const yearsQ = useQuery({ queryKey: ["years"], queryFn: () => apiGet<AcademicYear[]>("/academic/years") });
  const termsQ = useQuery({ queryKey: ["terms"], queryFn: () => apiGet<Term[]>("/academic/terms") });
  const classesQ = useQuery({ queryKey: ["classes"], queryFn: () => apiGet<SchoolClass[]>("/academic/classes") });
  const subjectsQ = useQuery({ queryKey: ["subjects"], queryFn: () => apiGet<Subject[]>("/academic/subjects") });
  const studentsQ = useQuery({ queryKey: ["students"], queryFn: () => apiGet<Student[]>("/students") });

  const classSubjectsQ = useQuery({
    queryKey: ["assessment-class-subjects", filters.classId, filters.yearId],
    queryFn: () =>
      apiGet<ClassSubjectRow[]>(
        `/academic/class-subjects?classId=${encodeURIComponent(filters.classId)}&academicYearId=${encodeURIComponent(filters.yearId)}`,
      ),
    enabled: Boolean(filters.classId && filters.yearId && tab === "cbc"),
  });

  const strandsQ = useQuery({
    queryKey: ["assessment-strands", filters.subjectId],
    queryFn: () =>
      apiGet<Array<{ id: string; name: string; subStrands: Array<{ name: string }>; competencies?: string[] }>>(
        `/assessments/strands?subjectId=${encodeURIComponent(filters.subjectId)}`,
      ),
    enabled: Boolean(filters.subjectId) && !isAdminOversight,
  });

  const combosQ = useQuery({
    queryKey: ["assessment-combinations"],
    queryFn: () => apiGet<ComboRow[]>("/assessments/combinations"),
  });

  const cbcQ = useCbcAssessments({
    classId: filters.classId,
    subjectId: filters.subjectId,
    termId: filters.termId,
    yearId: filters.yearId,
  });
  const cbcProjectsQ = useCbcProjects({
    classId: filters.classId,
    subjectId: filters.subjectId,
    termId: filters.termId,
    yearId: filters.yearId,
  });
  const cbcCommentsQ = useCbcComments({ classId: filters.classId, termId: filters.termId, yearId: filters.yearId });
  const cbcStatusQ = useCbcStatus({ classId: filters.classId, termId: filters.termId, yearId: filters.yearId });
  const cbcActions = useCbcActions();

  const alevelQ = useAlevelAssessments({
    classId: filters.classId,
    subjectId: filters.subjectId,
    combinationId: filters.combinationId,
    termId: filters.termId,
    yearId: filters.yearId,
  });
  const alevelDivQ = useAlevelDivision({
    classId: filters.classId,
    combinationId: filters.combinationId,
    termId: filters.termId,
    yearId: filters.yearId,
  });
  const alevelCommentsQ = useAlevelComments({ classId: filters.classId, termId: filters.termId, yearId: filters.yearId });
  const alevelStatusQ = useAlevelStatus({ classId: filters.classId, termId: filters.termId, yearId: filters.yearId });
  const alevelActions = useAlevelActions();
  const alevelGradingQ = useGradingScales("A_LEVEL");

  const students = useMemo(
    () => (studentsQ.data ?? []).filter((s) => !filters.classId || s.classId === filters.classId),
    [studentsQ.data, filters.classId],
  );

  const years = yearsQ.data ?? [];
  const terms = termsQ.data ?? [];
  const classes = classesQ.data ?? [];
  const catalog = subjectsQ.data ?? [];

  const levelForTab = tab === "cbc" ? "O_LEVEL" : "A_LEVEL";

  const yearOptions = useMemo(() => years.map((y) => ({ value: y.id, label: y.isActive ? `${y.name} (active)` : y.name })), [years]);

  const termsForYear = useMemo(() => terms.filter((t) => t.academicYearId === filters.yearId), [terms, filters.yearId]);
  const termOptions = useMemo(
    () => termsForYear.map((t) => ({ value: t.id, label: t.isActive ? `Term ${t.termNumber} (active)` : `Term ${t.termNumber}` })),
    [termsForYear],
  );

  const classesForYearAndLevel = useMemo(
    () => classes.filter((c) => c.academicYearId === filters.yearId && c.level === levelForTab),
    [classes, filters.yearId, levelForTab],
  );
  const classOptions = useMemo(
    () => classesForYearAndLevel.map((c) => ({ value: c.id, label: `${c.name} ${c.stream}` })),
    [classesForYearAndLevel],
  );

  const levelBySubjectId = useMemo(() => new Map(catalog.map((s) => [s.id, s.level])), [catalog]);

  const cbcSubjectOptions = useMemo(() => {
    const rows = classSubjectsQ.data ?? [];
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    for (const r of rows) {
      if (seen.has(r.subjectId)) continue;
      if (levelBySubjectId.get(r.subjectId) !== "O_LEVEL") continue;
      seen.add(r.subjectId);
      out.push({ value: r.subjectId, label: `${r.subjectCode} - ${r.subjectName}` });
    }
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  }, [classSubjectsQ.data, levelBySubjectId]);

  const combos = combosQ.data ?? [];
  const comboOptions = useMemo(() => combos.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })), [combos]);

  const selectedCombo = combos.find((c) => c.id === filters.combinationId);
  const alevelSubjectOptions = useMemo(() => {
    const subs = selectedCombo?.subjects ?? [];
    return subs.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` })).sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedCombo]);

  const subjectOptions = tab === "cbc" ? cbcSubjectOptions : alevelSubjectOptions;

  const subjectHelper =
    tab === "cbc"
      ? filters.classId && filters.yearId && !classSubjectsQ.isLoading && cbcSubjectOptions.length === 0
        ? "No O-Level subjects are assigned to this class for this year. Use Academic → Class subjects to assign them."
        : null
      : tab === "alevel" && !filters.combinationId
        ? "Choose a subject combination first, then pick a subject."
        : null;

  // Bootstrap defaults + restore last session (SRS workflow: Year → Term → Class → Subject)
  useEffect(() => {
    if (!years.length || !terms.length || !classes.length || bootstrapDone.current) return;

    let saved: PersistedContext = {};
    try {
      saved = JSON.parse(localStorage.getItem(CONTEXT_STORAGE_KEY) ?? "{}") as PersistedContext;
    } catch {
      saved = {};
    }

    const yearIdCandidate =
      saved.yearId && years.some((y) => y.id === saved.yearId) ? saved.yearId : years.find((y) => y.isActive)?.id ?? years[0]!.id;

    const termsInYear = terms.filter((t) => t.academicYearId === yearIdCandidate);
    const termIdCandidate =
      saved.termId && termsInYear.some((t) => t.id === saved.termId)
        ? saved.termId
        : termsInYear.find((t) => t.isActive)?.id ?? termsInYear[0]?.id ?? "";

    const nextTab = saved.tab === "alevel" ? "alevel" : "cbc";
    const lvl = nextTab === "cbc" ? "O_LEVEL" : "A_LEVEL";
    const classCandidates = classes.filter((c) => c.academicYearId === yearIdCandidate && c.level === lvl);
    const classIdCandidate =
      saved.classId && classCandidates.some((c) => c.id === saved.classId) ? saved.classId : classCandidates[0]?.id ?? "";

    setTab(nextTab);
    setFilters((prev) => ({
      ...prev,
      yearId: yearIdCandidate,
      termId: termIdCandidate,
      classId: classIdCandidate,
      combinationId: nextTab === "alevel" ? prev.combinationId : "",
      subjectId: saved.subjectId ?? "",
    }));

    bootstrapDone.current = true;
  }, [years, terms, classes]);

  /** A-Level combinations can load after year/class — resolve combination from storage or default */
  useEffect(() => {
    if (tab !== "alevel" || !combos.length) return;
    let savedCombo = "";
    try {
      savedCombo = (JSON.parse(localStorage.getItem(CONTEXT_STORAGE_KEY) ?? "{}") as PersistedContext).combinationId ?? "";
    } catch {
      savedCombo = "";
    }
    setFilters((p) => {
      if (p.combinationId && combos.some((c) => c.id === p.combinationId)) return p;
      if (savedCombo && combos.some((c) => c.id === savedCombo)) return { ...p, combinationId: savedCombo };
      return { ...p, combinationId: combos[0]!.id };
    });
  }, [tab, combos]);

  // Tab switch: move to a class that matches the new level if current class is wrong
  useEffect(() => {
    if (!filters.classId || !classes.length || !filters.yearId) return;
    const current = classes.find((c) => c.id === filters.classId);
    if (!current || current.level === levelForTab) return;
    const next = classes.find((c) => c.academicYearId === filters.yearId && c.level === levelForTab);
    if (next) {
      setFilters((p) => ({ ...p, classId: next.id, subjectId: "" }));
    }
  }, [tab, filters.classId, filters.yearId, classes, levelForTab]);

  // CBC: keep subject within class assignment list
  useEffect(() => {
    if (tab !== "cbc" || !filters.classId || !filters.yearId) return;
    if (classSubjectsQ.isLoading) return;
    if (!cbcSubjectOptions.length) {
      if (filters.subjectId) setFilters((p) => ({ ...p, subjectId: "" }));
      return;
    }
    if (!cbcSubjectOptions.some((o) => o.value === filters.subjectId)) {
      setFilters((p) => ({ ...p, subjectId: cbcSubjectOptions[0]!.value }));
    }
  }, [tab, filters.classId, filters.yearId, filters.subjectId, cbcSubjectOptions, classSubjectsQ.isLoading]);

  // A-Level: keep subject within combination
  useEffect(() => {
    if (tab !== "alevel" || !filters.combinationId) return;
    if (!alevelSubjectOptions.length) {
      if (filters.subjectId) setFilters((p) => ({ ...p, subjectId: "" }));
      return;
    }
    if (!alevelSubjectOptions.some((o) => o.value === filters.subjectId)) {
      setFilters((p) => ({ ...p, subjectId: alevelSubjectOptions[0]!.value }));
    }
  }, [tab, filters.combinationId, filters.subjectId, alevelSubjectOptions]);

  // Persist context for faster return visits
  useEffect(() => {
    if (!bootstrapDone.current) return;
    if (!filters.yearId) return;
    try {
      localStorage.setItem(
        CONTEXT_STORAGE_KEY,
        JSON.stringify({
          tab,
          yearId: filters.yearId,
          termId: filters.termId,
          classId: filters.classId,
          subjectId: filters.subjectId,
          combinationId: filters.combinationId,
        } satisfies PersistedContext),
      );
    } catch {
      /* ignore */
    }
  }, [filters, tab]);

  const summary = useMemo(() => {
    const y = years.find((x) => x.id === filters.yearId);
    const t = terms.find((x) => x.id === filters.termId);
    const cl = classes.find((x) => x.id === filters.classId);
    const subj =
      tab === "cbc"
        ? cbcSubjectOptions.find((x) => x.value === filters.subjectId)?.label
        : alevelSubjectOptions.find((x) => x.value === filters.subjectId)?.label;
    const parts = [
      y?.name,
      t ? `Term ${t.termNumber}` : null,
      cl ? `${cl.name} ${cl.stream}` : null,
      tab === "alevel" ? selectedCombo?.code : null,
      subj,
    ].filter(Boolean);
    return (
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-foreground">
        <span className="text-muted-foreground">{isAdminOversight ? "You are viewing" : "You are recording"}</span>
        <span className="font-medium">{tab === "cbc" ? "CBC (O-Level)" : "A-Level (UNEB)"}</span>
        <span className="text-muted-foreground">for</span>
        <span>{parts.length ? parts.join(" · ") : "— choose period, class, and subject below"}</span>
      </div>
    );
  }, [
    years,
    terms,
    classes,
    filters.yearId,
    filters.termId,
    filters.classId,
    filters.subjectId,
    tab,
    cbcSubjectOptions,
    alevelSubjectOptions,
    selectedCombo,
    isAdminOversight,
  ]);

  const isLoading =
    yearsQ.isLoading || termsQ.isLoading || classesQ.isLoading || subjectsQ.isLoading || studentsQ.isLoading;

  const filterHelperText = isAdminOversight
    ? "View-only filters to monitor submitted work. Teachers record marks in the subject-teacher and class-teacher portals."
    : "Pick year and term once, then class and subject. Your last choices are remembered on this device.";

  const cbcRatingRows = asRecordRows(cbcQ.data as unknown[] | undefined);
  const projectRows = asRecordRows(cbcProjectsQ.data as unknown[] | undefined);
  const alevelScoreRows = asRecordRows(alevelQ.data as unknown[] | undefined);

  const pageTitle = isAdminOversight ? "Assessment overview" : "Admin Assessment";
  const pageDescription = isAdminOversight
    ? "Read-only view of CBC and A-Level marks for oversight. Configure strands, subjects, and assignments under Academic."
    : "CBC and A-Level assessment management";

  return (
    <PageWrapper title={pageTitle} description={pageDescription}>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button variant={tab === "cbc" ? "primary" : "secondary"} onClick={() => setTab("cbc")}>
          O-Level (CBC) {!isAdminOversight && unsaved.cbc ? "•" : ""}
        </Button>
        <Button variant={tab === "alevel" ? "primary" : "secondary"} onClick={() => setTab("alevel")}>
          A-Level (UNEB) {!isAdminOversight && unsaved.alevel ? "•" : ""}
        </Button>
      </div>

      {ok ? <Alert tone="success">{ok}</Alert> : null}
      {err ? <Alert tone="error">{err}</Alert> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading assessment data...</p> : null}

      {isAdminOversight ? (
        <Alert tone="info">
          This page is for monitoring and planning only. Subject teachers enter competency ratings and exam scores; class teachers and
          the headteacher add comments. Use the links below to manage curriculum structure and assignments.
        </Alert>
      ) : null}

      {isAdminOversight ? (
        <div className="mt-4">
        <Card title="Academic configuration">
          <p className="mb-3 text-sm text-muted-foreground">
            Define CBC strands, grading scales, subject catalogue, A-Level combinations, and which teacher covers each class-subject.
            Those settings control what appears in teacher mark-entry screens and how grades are computed.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>
              <Link href="/admin/academic/cbc-strands" className="text-primary underline">
                CBC strands and competencies
              </Link>
            </li>
            <li>
              <Link href="/admin/academic/grading-scales" className="text-primary underline">
                Grading scales
              </Link>
            </li>
            <li>
              <Link href="/admin/academic/subjects" className="text-primary underline">
                Subjects
              </Link>
            </li>
            <li>
              <Link href="/admin/academic/class-subjects" className="text-primary underline">
                Class subject assignments
              </Link>
            </li>
            <li>
              <Link href="/admin/academic/teacher-assignments" className="text-primary underline">
                Teacher assignments
              </Link>
            </li>
            <li>
              <Link href="/admin/academic/combinations" className="text-primary underline">
                A-Level combinations
              </Link>
            </li>
          </ul>
        </Card>
        </div>
      ) : null}

      <div className={isAdminOversight ? "mt-4" : undefined}>
      <Card title="Assessment setup">
        <AssessmentFilters
          years={yearOptions}
          terms={termOptions}
          classes={classOptions}
          subjects={subjectOptions}
          combinations={comboOptions}
          includeCombination={tab === "alevel"}
          value={filters}
          onChange={(next) => setFilters((p) => ({ ...p, ...next }))}
          summary={summary}
          helperText={filterHelperText}
          subjectHelper={subjectHelper}
        />
      </Card>
      </div>

      {isAdminOversight && tab === "cbc" ? (
        <div className="mt-4 space-y-4">
          <Card title="Competency ratings (read-only)">
            {cbcQ.isFetching ? <p className="text-sm text-muted-foreground">Loading ratings…</p> : null}
            <ReadOnlyCbcRatingsTable rows={cbcRatingRows} />
          </Card>
          <Card title="Project and continuous assessment (read-only)">
            <ReadOnlyProjectAssessmentsTable rows={projectRows} />
          </Card>
          <Card title="Student comments">
            <CBCComments
              role={role}
              rows={
                (
                  cbcCommentsQ.data as
                    | Array<{
                        student_id: string;
                        student_name: string;
                        class_teacher_comment?: string;
                        headteacher_comment?: string;
                      }>
                    | undefined
                )?.map((x) => ({
                  studentId: x.student_id,
                  studentName: x.student_name,
                  classTeacherComment: x.class_teacher_comment,
                  headteacherComment: x.headteacher_comment,
                })) ?? []
              }
              onSave={() => Promise.resolve()}
            />
          </Card>
          <Card title="Assessment status overview">
            <AssessmentStatusOverview
              rows={
                (cbcStatusQ.data ?? []) as Array<{
                  subject_id: string;
                  subject_name: string;
                  subject_code: string;
                  teacher_name: string;
                  status: string;
                }>
              }
              canUnlock={false}
              onUnlock={async () => {}}
            />
          </Card>
          <p className="text-xs text-muted-foreground">Rows loaded from server: {cbcRatingRows.length}</p>
        </div>
      ) : null}

      {isAdminOversight && tab === "alevel" ? (
        <div className="mt-4 space-y-4">
          <Card title="Scores (read-only)">
            {alevelQ.isFetching ? <p className="text-sm text-muted-foreground">Loading scores…</p> : null}
            <ReadOnlyAlevelScoresTable rows={alevelScoreRows} />
          </Card>
          <Card title="Division summary">
            <ALevelDivisionSummary rows={(alevelDivQ.data as Array<Record<string, unknown>> | undefined) ?? []} />
          </Card>
          <Card title="Comments">
            <ALevelComments
              role={role}
              rows={
                (
                  alevelCommentsQ.data as
                    | Array<{
                        student_id: string;
                        student_name: string;
                        class_teacher_comment?: string;
                        headteacher_remark?: string;
                      }>
                    | undefined
                )?.map((x) => ({
                  studentId: x.student_id,
                  studentName: x.student_name,
                  classTeacherComment: x.class_teacher_comment,
                  headteacherRemark: x.headteacher_remark,
                })) ?? []
              }
              onSave={() => Promise.resolve()}
            />
          </Card>
          <Card title="Assessment status overview">
            <AssessmentStatusOverview rows={(alevelStatusQ.data as Array<Record<string, unknown>> | undefined) ?? []} canUnlock={false} />
          </Card>
          <p className="text-xs text-muted-foreground">Rows loaded from server: {alevelScoreRows.length}</p>
        </div>
      ) : null}

      {!isAdminOversight && tab === "cbc" ? (
        <div className="mt-4 space-y-4">
          <SubmitLockBanner state="draft" />
          <Card title="Competency score entry">
            <CbcAssessmentGrid
              students={students}
              strands={(strandsQ.data ?? []).map((s) => ({
                id: s.id,
                name: s.name,
                competencies: s.subStrands?.length ? s.subStrands.map((x) => x.name) : s.competencies ?? [],
              }))}
              onSave={async (items) => {
                setErr(null);
                setUnsaved((p) => ({ ...p, cbc: false }));
                await cbcActions.saveBulk.mutateAsync({
                  assessments: items.map((i) => ({
                    studentId: i.studentId,
                    subjectId: filters.subjectId,
                    strand: i.strand,
                    competency: i.competency,
                    rating: i.rating,
                  })),
                  termId: filters.termId,
                  yearId: filters.yearId,
                });
                setOk("CBC scores saved.");
              }}
              onSubmit={async () => {
                const yes = window.confirm("Submit and lock all entries for this subject?");
                if (!yes) return;
                await cbcActions.submit.mutateAsync({
                  subjectId: filters.subjectId,
                  classId: filters.classId,
                  termId: filters.termId,
                  yearId: filters.yearId,
                });
                setOk("CBC submission completed.");
              }}
            />
          </Card>
          <Card title="Project and continuous assessment">
            {students[0] ? (
              <CBCProjectAssessment
                studentId={students[0].id}
                subjectId={filters.subjectId}
                termId={filters.termId}
                yearId={filters.yearId}
                onSave={(payload) => cbcActions.createProject.mutateAsync(payload)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No students enrolled in this class.</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Existing rows: {(cbcProjectsQ.data ?? []).length}</p>
          </Card>
          <Card title="Student comments">
            <CBCComments
              role={role}
              rows={
                (
                  cbcCommentsQ.data as
                    | Array<{
                        student_id: string;
                        student_name: string;
                        class_teacher_comment?: string;
                        headteacher_comment?: string;
                      }>
                    | undefined
                )?.map((x) => ({
                  studentId: x.student_id,
                  studentName: x.student_name,
                  classTeacherComment: x.class_teacher_comment,
                  headteacherComment: x.headteacher_comment,
                })) ?? []
              }
              onSave={(studentId, payload) =>
                cbcActions.updateComment.mutateAsync({
                  studentId,
                  payload: { ...payload, termId: filters.termId, yearId: filters.yearId },
                })
              }
            />
          </Card>
          <Card title="Assessment status overview">
            <AssessmentStatusOverview
              rows={
                (cbcStatusQ.data ?? []) as Array<{
                  subject_id: string;
                  subject_name: string;
                  subject_code: string;
                  teacher_name: string;
                  status: string;
                }>
              }
              canUnlock={role === "headteacher"}
              onUnlock={async (subjectId) => {
                const yes = window.confirm("Unlock this subject for correction?");
                if (!yes) return;
                await cbcActions.unlock.mutateAsync({
                  subjectId,
                  classId: filters.classId,
                  termId: filters.termId,
                  yearId: filters.yearId,
                });
                setOk("CBC assessment unlocked.");
              }}
            />
          </Card>
          <p className="text-xs text-muted-foreground">Rows loaded from server: {(cbcQ.data ?? []).length}</p>
        </div>
      ) : null}

      {!isAdminOversight && tab === "alevel" ? (
        <div className="mt-4 space-y-4">
          <SubmitLockBanner state="draft" />
          <Card title="Score entry grid">
            <ALevelScoreGrid
              students={students}
              gradingScaleRows={alevelGradingQ.data}
              onSave={async (items) => {
                setUnsaved((p) => ({ ...p, alevel: false }));
                await alevelActions.saveBulk.mutateAsync({
                  assessments: items.map((i) => ({
                    studentId: i.studentId,
                    subjectId: filters.subjectId,
                    score: i.score,
                  })),
                  termId: filters.termId,
                  yearId: filters.yearId,
                });
                setOk("A-Level scores saved.");
              }}
              onSubmit={async () => {
                const yes = window.confirm("Submit and lock all A-Level entries for this subject?");
                if (!yes) return;
                await alevelActions.submit.mutateAsync({
                  subjectId: filters.subjectId,
                  classId: filters.classId,
                  termId: filters.termId,
                  yearId: filters.yearId,
                });
                setOk("A-Level submission completed.");
              }}
            />
          </Card>
          <Card title="Division summary">
            <ALevelDivisionSummary rows={(alevelDivQ.data as Array<Record<string, unknown>> | undefined) ?? []} />
          </Card>
          <Card title="Comments">
            <ALevelComments
              role={role}
              rows={
                (
                  alevelCommentsQ.data as
                    | Array<{
                        student_id: string;
                        student_name: string;
                        class_teacher_comment?: string;
                        headteacher_remark?: string;
                      }>
                    | undefined
                )?.map((x) => ({
                  studentId: x.student_id,
                  studentName: x.student_name,
                  classTeacherComment: x.class_teacher_comment,
                  headteacherRemark: x.headteacher_remark,
                })) ?? []
              }
              onSave={(studentId, payload) =>
                alevelActions.updateComment.mutateAsync({
                  studentId,
                  payload: { ...payload, termId: filters.termId, yearId: filters.yearId },
                })
              }
            />
          </Card>
          <Card title="Assessment status overview">
            <AssessmentStatusOverview rows={(alevelStatusQ.data as Array<Record<string, unknown>> | undefined) ?? []} canUnlock={false} />
          </Card>
          <p className="text-xs text-muted-foreground">Rows loaded from server: {(alevelQ.data ?? []).length}</p>
        </div>
      ) : null}
    </PageWrapper>
  );
}
