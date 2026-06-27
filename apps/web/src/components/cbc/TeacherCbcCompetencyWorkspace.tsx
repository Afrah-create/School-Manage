"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Student } from "@uganda-cbc-sms/shared";
import { ActivityTypeBadge } from "@/components/cbc/ActivityTypeBadge";
import { CbcActivityCreateForm } from "@/components/cbc/CbcActivityCreateForm";
import { CbcActivityRatingsGrid } from "@/components/cbc/CbcActivityRatingsGrid";
import { CbcLearningOutcomesPanel } from "@/components/cbc/CbcLearningOutcomesPanel";
import { ProjectWorkGrid } from "@/components/assessment/ProjectWorkGrid";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";
import {
  activityContextKey,
  loadStoredActivities,
  type AssessmentActivity,
} from "@/lib/cbcCompetency";
import { useCbcCompetencyCatalog } from "@/hooks/useCbcCompetencyCatalog";
import { apiGet } from "@/lib/api";
import { manualStatus } from "@/lib/queryStatus";

function roleBase(pathname: string): "/class-teacher" | "/subject-teacher" {
  return pathname.includes("/class-teacher/") ? "/class-teacher" : "/subject-teacher";
}

const MAIN_TABS = [
  {
    id: "activities",
    label: "Activities & ratings",
    subtitle: "Record NCDC competency levels per activity",
  },
  {
    id: "outcomes",
    label: "Learning outcomes",
    subtitle: "Track specific learning outcomes per strand",
  },
  {
    id: "projects",
    label: "Project work (official CA)",
    subtitle:
      "Official continuous assessment — feeds your composite A–E grade, separate from competency ratings above",
  },
] as const;

type MainTabId = (typeof MAIN_TABS)[number]["id"];

export function TeacherCbcCompetencyWorkspace() {
  const pathname = usePathname();
  const listHref = `${roleBase(pathname)}/assessment/cbc`;
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId") ?? "";
  const subjectId = searchParams.get("subjectId") ?? "";
  const termId = searchParams.get("termId") ?? "";
  const yearId = searchParams.get("yearId") ?? "";
  const initialActivityId = searchParams.get("activityId") ?? "";

  const [mainTab, setMainTab] = useState<MainTabId>("activities");
  const [activities, setActivities] = useState<AssessmentActivity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [strandFilter, setStrandFilter] = useState("");

  const contextKey = activityContextKey(classId, subjectId, termId, yearId);
  const contextReady = Boolean(classId && subjectId && termId && yearId);

  useEffect(() => {
    if (!contextReady) return;
    const stored = loadStoredActivities(contextKey);
    setActivities(stored);
    if (initialActivityId && stored.some((a) => a.id === initialActivityId)) {
      setSelectedActivityId(initialActivityId);
    } else if (stored[0]) {
      setSelectedActivityId(stored[0].id);
    }
  }, [contextKey, contextReady, initialActivityId]);

  const studentsQ = useQuery({
    queryKey: ["students", classId],
    queryFn: () => apiGet<Student[]>(`/students?classId=${encodeURIComponent(classId)}`),
    enabled: contextReady,
  });

  const students = useMemo(
    () =>
      (studentsQ.data ?? []).map((s) => ({
        id: s.id,
        fullName: s.fullName,
        studentNumber: s.studentNumber,
      })),
    [studentsQ.data],
  );

  const sampleStudentId = students[0]?.id;

  const catalog = useCbcCompetencyCatalog({
    subjectId,
    termId,
    sampleStudentId,
    enabled: contextReady && Boolean(sampleStudentId),
  });

  const filteredCompetencies = useMemo(() => {
    if (!strandFilter) return catalog.resolved;
    return catalog.resolved.filter((c) => c.strandId === strandFilter);
  }, [catalog.resolved, strandFilter]);

  const selectedActivity = activities.find((a) => a.id === selectedActivityId) ?? null;

  const editableActivities = activities.filter((a) => !a.is_locked);
  const activityOptions = activities.map((a) => ({
    value: a.id,
    label: `${a.title}${a.is_locked ? " (locked)" : ""}`,
  }));

  const strandOptions = catalog.strands.map((s) => ({ value: s.id, label: s.name }));

  const studentsStatus = manualStatus({
    loading: studentsQ.isPending || catalog.isLoading,
    error: studentsQ.error ?? catalog.error,
    data: students,
  });

  if (!contextReady) {
    return (
      <Alert tone="info">
        Choose a class and subject from{" "}
        <Link href={listHref} className="font-medium text-brand underline">
          your assignments
        </Link>{" "}
        to enter NCDC competency ratings.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Link href={listHref} className="inline-block text-sm font-medium text-brand hover:underline">
        ← My assignments
      </Link>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`px-3 py-2 text-left ${
              mainTab === tab.id ? "border-b-2 border-brand" : "border-b-2 border-transparent"
            }`}
            onClick={() => setMainTab(tab.id)}
          >
            <span
              className={`block text-sm font-medium ${
                mainTab === tab.id ? "text-brand" : "text-foreground"
              }`}
            >
              {tab.label}
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">{tab.subtitle}</span>
          </button>
        ))}
      </div>

      {mainTab === "projects" ? (
        <AsyncContent
          status={studentsStatus}
          loading={<FormSkeleton fields={4} />}
          error={
            <ErrorState
              message="Could not load students."
              onRetry={() => void studentsQ.refetch()}
            />
          }
        >
          {students.length === 0 ? (
            <Alert tone="info">No students are enrolled in this class.</Alert>
          ) : (
            <ProjectWorkGrid
              classId={classId}
              subjectId={subjectId}
              termId={termId}
              yearId={yearId}
              students={students}
            />
          )}
        </AsyncContent>
      ) : null}

      {mainTab === "outcomes" ? (
        <AsyncContent
          status={studentsStatus}
          loading={<FormSkeleton fields={4} />}
          error={
            <ErrorState message="Could not load class data." onRetry={() => void studentsQ.refetch()} />
          }
        >
          {students.length === 0 ? (
            <Alert tone="info">No students in this class.</Alert>
          ) : strandOptions.length === 0 ? (
            <Alert tone="info">Configure CBC strands for this subject before adding learning outcomes.</Alert>
          ) : (
            <CbcLearningOutcomesPanel
              subjectId={subjectId}
              termId={termId}
              strandOptions={strandOptions}
              students={students}
            />
          )}
        </AsyncContent>
      ) : null}

      {mainTab === "activities" ? (
        <div className="space-y-6">
          <CbcActivityCreateForm
            subjectId={subjectId}
            classId={classId}
            termId={termId}
            academicYearId={yearId}
            onCreated={(activity) => {
              setActivities((prev) => [activity, ...prev.filter((a) => a.id !== activity.id)]);
              setSelectedActivityId(activity.id);
            }}
          />

          {catalog.needsSummarySeed && !catalog.hasSummaryData ? (
            <Alert tone="info">
              <strong>Competency catalog gap:</strong> There is no GET endpoint for{" "}
              <code className="text-xs">cbc_competencies</code> IDs. After legacy data import (migration 073) or once
              any term summary exists, competency IDs can be resolved. Otherwise ratings cannot be submitted to the new
              API.
            </Alert>
          ) : null}

          {activities.length > 0 ? (
            <Select
              label="Assessment activity"
              options={activityOptions}
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
            />
          ) : (
            <Alert tone="info">
              No activities in this browser session yet. Create one above — activities are stored locally until a GET{" "}
              <code className="text-xs">/assessments/cbc/activities</code> endpoint exists.
            </Alert>
          )}

          {selectedActivity ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <ActivityTypeBadge type={selectedActivity.activity_type} />
                <span>{selectedActivity.activity_date}</span>
                {selectedActivity.is_locked ? (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">Locked</span>
                ) : null}
              </div>

              {catalog.strands.length > 1 ? (
                <Select
                  label="Strand filter"
                  options={[
                    { value: "", label: "All strands" },
                    ...strandOptions,
                  ]}
                  value={strandFilter}
                  onChange={(e) => setStrandFilter(e.target.value)}
                />
              ) : null}

              <AsyncContent
                status={studentsStatus}
                loading={<FormSkeleton fields={6} />}
                error={
                  <ErrorState
                    message="Could not load students or competency catalog."
                    onRetry={() => {
                      void studentsQ.refetch();
                      catalog.refetch();
                    }}
                  />
                }
              >
                {students.length === 0 ? (
                  <Alert tone="info">No students in this class.</Alert>
                ) : (
                  <CbcActivityRatingsGrid
                    activity={selectedActivity}
                    students={students}
                    competencies={filteredCompetencies}
                    readOnly={selectedActivity.is_locked}
                    onLocked={() => {
                      setActivities((prev) =>
                        prev.map((a) =>
                          a.id === selectedActivity.id ? { ...a, is_locked: true, locked_at: new Date().toISOString() } : a,
                        ),
                      );
                    }}
                  />
                )}
              </AsyncContent>
            </div>
          ) : null}

          {editableActivities.length === 0 && activities.length > 0 ? (
            <Alert tone="info">All activities for this class are locked.</Alert>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
