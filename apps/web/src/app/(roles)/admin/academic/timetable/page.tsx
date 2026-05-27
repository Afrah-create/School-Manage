"use client";

import type { AcademicYear, SchoolClass, Term, TimetableValidateResult } from "@uganda-cbc-sms/shared";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { AcademicLevelScope } from "@/components/academic/AcademicLevelScope";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { TimetableClassGrid, TimetableTeacherGrid } from "@/components/timetable/TimetableClassGrid";
import {
  periodsToDraft,
  TimetablePeriodEditor,
  type PeriodDraft,
} from "@/components/timetable/TimetablePeriodEditor";
import { TimetablePublishedViewer } from "@/components/timetable/TimetablePublishedViewer";
import { TimetablePublishBar } from "@/components/timetable/TimetablePublishBar";
import { TimetableValidationPanel } from "@/components/timetable/TimetableValidationPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useAcademicLevelScope } from "@/hooks/useAcademicLevelScope";
import {
  useTimetableClassGrid,
  useTimetableClassSubjects,
  useTimetableSlotOccupancy,
  useTimetableDays,
  useTimetableDraft,
  useTimetableMutations,
  useTimetablePeriods,
  useTimetablePublicationLog,
  useTimetableTeacherGrid,
  useTimetableTemplates,
  type TimetableScope,
} from "@/hooks/useTimetable";
import { filterClassesByLevel } from "@/lib/academicLevel";
import { apiGet } from "@/lib/api";
import { queryStatus } from "@/lib/queryStatus";

type TabId = "setup" | "class" | "teacher" | "publish" | "view";

const TAB_IDS: TabId[] = ["view", "setup", "class", "teacher", "publish"];

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: "view", label: "View published" },
  { id: "setup", label: "Periods & days" },
  { id: "class", label: "By class" },
  { id: "teacher", label: "By teacher" },
  { id: "publish", label: "Publish" },
];

function parseTab(value: string | null): TabId {
  if (value && TAB_IDS.includes(value as TabId)) return value as TabId;
  return "view";
}

const DAY_ROWS = [
  { dayOfWeek: 1, label: "Monday" },
  { dayOfWeek: 2, label: "Tuesday" },
  { dayOfWeek: 3, label: "Wednesday" },
  { dayOfWeek: 4, label: "Thursday" },
  { dayOfWeek: 5, label: "Friday" },
  { dayOfWeek: 6, label: "Saturday" },
  { dayOfWeek: 7, label: "Sunday" },
];

function AdminTimetablePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { level, setLevel, hrefWithLevel } = useAcademicLevelScope();
  const [tab, setTab] = useState<TabId>(() => parseTab(searchParams.get("tab")));

  const setTabAndUrl = useCallback(
    (next: TabId) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (!searchParams.get("tab")) {
      setTabAndUrl("view");
      return;
    }
    const fromUrl = parseTab(searchParams.get("tab"));
    if (fromUrl !== tab) setTab(fromUrl);
  }, [searchParams, tab, setTabAndUrl]);
  const [yearId, setYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [periodDraft, setPeriodDraft] = useState<PeriodDraft[]>([]);
  const [dayDraft, setDayDraft] = useState(DAY_ROWS.map((d) => ({ dayOfWeek: d.dayOfWeek, isSchoolDay: d.dayOfWeek <= 5 })));
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [validationReport, setValidationReport] = useState<TimetableValidateResult | null>(null);

  const yearsQ = useQuery({
    queryKey: ["years", "timetable"],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
  });
  const termsQ = useQuery({
    queryKey: ["terms", "timetable", yearId],
    queryFn: () => apiGet<Term[]>(`/academic/terms?academicYearId=${encodeURIComponent(yearId)}`),
    enabled: Boolean(yearId),
  });
  const classesQ = useQuery({
    queryKey: ["classes", "timetable"],
    queryFn: () => apiGet<SchoolClass[]>("/academic/classes"),
  });
  const teachersQ = useQuery({
    queryKey: ["users", "timetable-teachers"],
    queryFn: async () => {
      const res = await apiGet<{ items?: Array<{ id: string; fullName: string; role: string }> } | Array<{ id: string; fullName: string; role: string }>>("/users");
      const list = Array.isArray(res) ? res : (res.items ?? []);
      return list.filter((u) => ["class_teacher", "subject_teacher", "headteacher"].includes(u.role));
    },
  });

  const years = yearsQ.data ?? [];
  const terms = (termsQ.data ?? []).filter((t) => !yearId || t.academicYearId === yearId);
  const classes = filterClassesByLevel(classesQ.data ?? [], level, yearId);

  useEffect(() => {
    if (!yearId && years.length) {
      const active = years.find((y) => y.isActive) ?? years[0];
      if (active) setYearId(active.id);
    }
  }, [years, yearId]);

  useEffect(() => {
    if (!termId && terms.length) {
      const active = terms.find((t) => t.isActive) ?? terms[0];
      if (active) setTermId(active.id);
    }
  }, [terms, termId]);

  useEffect(() => {
    if (!classId && classes[0]) setClassId(classes[0].id);
  }, [classes, classId]);

  const scope: TimetableScope = useMemo(
    () => ({ academicYearId: yearId, termId, level }),
    [yearId, termId, level],
  );

  const draftQ = useTimetableDraft(scope);
  const templatesQ = useTimetableTemplates(scope);
  const templateId = draftQ.data?.id ?? "";
  const periodsQ = useTimetablePeriods(templateId);
  const daysQ = useTimetableDays(templateId);
  const classSubjectsQ = useTimetableClassSubjects(templateId, classId);
  const slotOccupancyQ = useTimetableSlotOccupancy(templateId, classId);
  const classGridQ = useTimetableClassGrid(templateId, classId);
  const teacherGridQ = useTimetableTeacherGrid(templateId, teacherId);
  const publicationLogQ = useTimetablePublicationLog(templateId);
  const mutations = useTimetableMutations(scope);

  useEffect(() => {
    if (periodsQ.data) setPeriodDraft(periodsToDraft(periodsQ.data));
  }, [periodsQ.data]);

  useEffect(() => {
    if (daysQ.data?.length) {
      setDayDraft(
        DAY_ROWS.map((d) => {
          const hit = daysQ.data!.find((x) => x.dayOfWeek === d.dayOfWeek);
          return { dayOfWeek: d.dayOfWeek, isSchoolDay: hit?.isSchoolDay ?? d.dayOfWeek <= 5 };
        }),
      );
    }
  }, [daysQ.data]);

  const editable = draftQ.data?.status === "draft";

  const yearOptions = years.map((y) => ({ value: y.id, label: y.name + (y.isActive ? " (active)" : "") }));
  const termOptions = terms.map((t) => ({ value: t.id, label: `Term ${t.termNumber}` }));
  const classOptions = classes.map((c) => ({
    value: c.id,
    label: c.stream ? `${c.name} · ${c.stream}` : c.name,
  }));
  const teacherOptions = (teachersQ.data ?? []).map((t) => ({ value: t.id, label: t.fullName }));

  const publishedTemplate = (templatesQ.data ?? []).find((t) => t.status === "published");

  const setupStatus = queryStatus(draftQ);
  const classGridStatus = queryStatus(classGridQ);
  const teacherGridStatus = queryStatus(teacherGridQ);

  const savePeriods = async () => {
    if (!templateId) return;
    setErr(null);
    setOk(null);
    try {
      await mutations.savePeriods.mutateAsync({
        templateId,
        payload: { periods: periodDraft },
      });
      setOk("Bell schedule saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save periods");
    }
  };

  const saveDays = async () => {
    if (!templateId) return;
    setErr(null);
    setOk(null);
    try {
      await mutations.saveDays.mutateAsync({
        templateId,
        payload: { days: dayDraft },
      });
      setOk("School days saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save days");
    }
  };

  const runValidate = async () => {
    if (!templateId) return;
    setErr(null);
    try {
      const report = await mutations.validate.mutateAsync(templateId);
      setValidationReport(report);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Validation failed");
    }
  };

  const runPublish = async () => {
    if (!templateId) return;
    setErr(null);
    setOk(null);
    try {
      if (!validationReport) await runValidate();
      const report = validationReport ?? (await mutations.validate.mutateAsync(templateId));
      if (!report.canPublish) {
        setValidationReport(report);
        setErr("Fix validation errors before publishing.");
        return;
      }
      await mutations.publish.mutateAsync({
        templateId,
        payload: { acknowledgeWarnings: report.warnings.length > 0 },
      });
      setOk("Timetable published for teachers.");
      setValidationReport(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Publish failed");
    }
  };

  const cloneFromPublished = async () => {
    if (!publishedTemplate || !templateId) return;
    setErr(null);
    try {
      await mutations.clone.mutateAsync({
        sourceTemplateId: publishedTemplate.id,
        payload: { targetTemplateId: templateId, copyEntries: true },
      });
      setOk("Copied schedule from published timetable.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Clone failed");
    }
  };

  return (
    <PageWrapper
      title="Timetable"
      description="View published schedules, then build and publish drafts per term and level."
    >
      <p className="-mt-4 mb-4 text-sm text-muted-foreground">
        Start on <strong className="font-medium text-foreground">View published</strong> to browse live and archived
        timetables. Opening the builder after publish starts a new draft copied from the live schedule; each class grid
        also picks up that class&apos;s published lessons if the draft row is still empty. Use{" "}
        <strong className="font-medium text-foreground">Periods &amp; days</strong>,{" "}
        <strong className="font-medium text-foreground">By class</strong>, and{" "}
        <strong className="font-medium text-foreground">Publish</strong> to edit drafts. Subjects and teachers are set
        under{" "}
        <Link href={hrefWithLevel("/admin/academic/class-subjects")} className="font-medium text-brand hover:underline">
          Class subjects
        </Link>{" "}
        and{" "}
        <Link href={hrefWithLevel("/admin/academic/teacher-assignments")} className="font-medium text-brand hover:underline">
          Subject teachers
        </Link>
        .
      </p>

      {err ? <Alert tone="error">{err}</Alert> : null}
      {ok ? <Alert tone="success">{ok}</Alert> : null}

      <div className="mb-4">
        <AcademicLevelScope level={level} onLevelChange={setLevel} />
      </div>

      <Card title="Scope">
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Academic year" options={yearOptions} value={yearId} onChange={(e) => setYearId(e.target.value)} />
          <Select label="Term" options={termOptions} value={termId} onChange={(e) => setTermId(e.target.value)} />
        </div>
      </Card>

      {tab !== "view" ? (
        <div className="mt-4">
          <TimetablePublishBar
            template={draftQ.data}
            onValidate={() => void runValidate()}
            onPublish={() => void runPublish()}
            validating={mutations.validate.isPending}
            publishing={mutations.publish.isPending}
            disabled={!templateId}
          />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 border-b border-border pb-2">
        {TAB_LABELS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-ui ${
              tab === id ? "bg-brand text-white" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTabAndUrl(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "view" ? (
        <div className="mt-4">
          <TimetablePublishedViewer academicYearId={yearId} termId={termId} level={level} />
        </div>
      ) : null}

      {tab === "setup" ? (
        <AsyncContent
          status={setupStatus}
          loading={<TableSkeleton rows={6} cols={4} />}
          error={
            <ErrorState
              message={draftQ.error instanceof Error ? draftQ.error.message : "Failed to load timetable"}
              onRetry={() => void draftQ.refetch()}
            />
          }
          className="mt-4 space-y-4"
        >
          <Card title="Bell schedule">
            <p className="mb-3 text-sm text-muted-foreground">
              Define teaching periods and breaks. Non-teaching rows appear as breaks in the grid.
            </p>
            <TimetablePeriodEditor periods={periodDraft} onChange={setPeriodDraft} disabled={!editable} />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" disabled={!editable} loading={mutations.savePeriods.isPending} onClick={() => void savePeriods()}>
                Save periods
              </Button>
              {publishedTemplate ? (
                <Button type="button" variant="secondary" disabled={!editable} onClick={() => void cloneFromPublished()}>
                  Copy from published v{publishedTemplate.version}
                </Button>
              ) : null}
            </div>
          </Card>

          <Card title="School days">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {DAY_ROWS.map((d, index) => (
                <label key={d.dayOfWeek} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={dayDraft[index]?.isSchoolDay ?? false}
                    disabled={!editable}
                    onChange={(e) =>
                      setDayDraft((prev) =>
                        prev.map((row, i) => (i === index ? { ...row, isSchoolDay: e.target.checked } : row)),
                      )
                    }
                  />
                  {d.label}
                </label>
              ))}
            </div>
            <div className="mt-4">
              <Button type="button" disabled={!editable} loading={mutations.saveDays.isPending} onClick={() => void saveDays()}>
                Save school days
              </Button>
            </div>
          </Card>
        </AsyncContent>
      ) : null}

      {tab === "class" ? (
        <div className="mt-4 space-y-4">
          <Card title="Class builder">
            <div className="mb-4 max-w-md">
              <Select label="Class" options={classOptions} value={classId} onChange={(e) => setClassId(e.target.value)} />
            </div>
            <AsyncContent
              status={classGridStatus}
              loading={<TableSkeleton rows={8} cols={6} />}
              error={
                <ErrorState
                  message={classGridQ.error instanceof Error ? classGridQ.error.message : "Failed to load class grid"}
                  onRetry={() => void classGridQ.refetch()}
                />
              }
            >
              {classGridQ.data ? (
                <TimetableClassGrid
                  grid={classGridQ.data}
                  slotOptions={classSubjectsQ.data ?? []}
                  slotOccupancy={slotOccupancyQ.data}
                  editable={editable}
                  saving={mutations.saveClassGrid.isPending}
                  onSave={async (entries) => {
                    setErr(null);
                    setOk(null);
                    try {
                      await mutations.saveClassGrid.mutateAsync({
                        templateId,
                        classId,
                        payload: { entries },
                      });
                      setOk("Class timetable saved.");
                    } catch (e) {
                      setErr(e instanceof Error ? e.message : "Failed to save grid");
                      throw e;
                    }
                  }}
                />
              ) : null}
            </AsyncContent>
          </Card>
        </div>
      ) : null}

      {tab === "teacher" ? (
        <div className="mt-4 space-y-4">
          <Card title="Teacher view">
            <div className="mb-4 max-w-md">
              <Select
                label="Teacher"
                options={teacherOptions}
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              />
            </div>
            <AsyncContent
              status={teacherGridStatus}
              loading={<TableSkeleton rows={8} cols={6} />}
              error={
                <ErrorState
                  message={teacherGridQ.error instanceof Error ? teacherGridQ.error.message : "Failed to load teacher grid"}
                  onRetry={() => void teacherGridQ.refetch()}
                />
              }
            >
              {teacherGridQ.data && teacherId ? <TimetableTeacherGrid grid={teacherGridQ.data} /> : (
                <p className="text-sm text-muted-foreground">Select a teacher to preview their weekly grid.</p>
              )}
            </AsyncContent>
          </Card>
        </div>
      ) : null}

      {tab === "publish" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Validation">
            <TimetableValidationPanel report={validationReport} />
            <div className="mt-4">
              <Button type="button" variant="secondary" onClick={() => void runValidate()}>
                Run validation
              </Button>
            </div>
          </Card>
          <Card title="Publication history">
            {(publicationLogQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Not published yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(publicationLogQ.data ?? []).map((row) => (
                  <li key={row.id} className="rounded-md border border-border px-3 py-2">
                    <div className="font-medium">Version {row.version}</div>
                    <div className="text-muted-foreground">
                      {new Date(row.publishedAt).toLocaleString()} · {row.entryCount} entries ·{" "}
                      {row.publishedByName ?? "Unknown"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}
    </PageWrapper>
  );
}

export default function AdminTimetablePage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading timetable…</p>}>
      <AdminTimetablePageContent />
    </Suspense>
  );
}
