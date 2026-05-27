"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, History, RefreshCw } from "lucide-react";
import type { TimetableBrowseItem } from "@uganda-cbc-sms/shared";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TimetableReadOnlyGrid } from "@/components/timetable/TimetableReadOnlyGrid";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  useTimetableBrowse,
  useTimetableClassGrid,
  useTimetableOverview,
  useTimetablePublicationLog,
  useTimetableTeacherGrid,
} from "@/hooks/useTimetable";
import { classDisplayName, type AcademicLevel } from "@/lib/academicLevel";
import { queryStatus } from "@/lib/queryStatus";

type ViewMode = "class" | "teacher";
type StatusFilter = "active" | "archived" | "all";

type Props = {
  academicYearId: string;
  termId: string;
  level: AcademicLevel;
};

export function TimetablePublishedViewer({ academicYearId, termId, level }: Props) {
  const [status, setStatus] = useState<StatusFilter>("active");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("class");
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const browseEnabled = Boolean(academicYearId && termId);
  const browseQ = useTimetableBrowse({
    academicYearId: academicYearId || undefined,
    termId: termId || undefined,
    level,
    status,
  });

  const selectedId =
    selectedTemplateId || browseQ.data?.find((t) => t.isActive)?.id || browseQ.data?.[0]?.id || "";

  const overviewQ = useTimetableOverview(selectedId);
  const logQ = useTimetablePublicationLog(selectedId);
  const classGridQ = useTimetableClassGrid(selectedId, viewMode === "class" ? classId : "");
  const teacherGridQ = useTimetableTeacherGrid(selectedId, viewMode === "teacher" ? teacherId : "");
  const gridQ = viewMode === "class" ? classGridQ : teacherGridQ;

  const selectedItem = browseQ.data?.find((t) => t.id === selectedId);

  useEffect(() => {
    if (!browseQ.data?.length) {
      setSelectedTemplateId("");
      return;
    }
    const stillValid = browseQ.data.some((t) => t.id === selectedTemplateId);
    if (!stillValid) {
      const pick = browseQ.data.find((t) => t.isActive) ?? browseQ.data[0];
      if (pick) setSelectedTemplateId(pick.id);
    }
  }, [browseQ.data, selectedTemplateId]);

  useEffect(() => {
    if (!overviewQ.data) return;
    if (viewMode === "class") {
      const valid = overviewQ.data.classes.some((c) => c.classId === classId);
      if (!valid && overviewQ.data.classes[0]) setClassId(overviewQ.data.classes[0].classId);
    } else {
      const valid = overviewQ.data.teachers.some((t) => t.teacherId === teacherId);
      if (!valid && overviewQ.data.teachers[0]) setTeacherId(overviewQ.data.teachers[0].teacherId);
    }
  }, [selectedId, overviewQ.data, viewMode, classId, teacherId]);

  const scheduleOptions = useMemo(
    () =>
      (browseQ.data ?? []).map((item) => ({
        value: item.id,
        label: scheduleLabel(item),
      })),
    [browseQ.data],
  );

  const classOptions = useMemo(
    () =>
      (overviewQ.data?.classes ?? []).map((c) => {
        const base = classDisplayName({ name: c.className, stream: c.classStream });
        return {
          value: c.classId,
          label: c.lessonCount > 0 ? `${base} (${c.lessonCount} lessons)` : base,
        };
      }),
    [overviewQ.data?.classes],
  );

  const teacherOptions = useMemo(
    () =>
      (overviewQ.data?.teachers ?? []).map((t) => ({
        value: t.teacherId,
        label: t.teacherName,
      })),
    [overviewQ.data?.teachers],
  );

  const browseStatus = queryStatus(browseQ);
  const gridStatus = queryStatus(gridQ);

  if (!browseEnabled) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Select an academic year and term above to view published schedules.
      </p>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col">
      <div className="shrink-0 space-y-3 border-b border-border pb-3">
        <p className="text-xs text-muted-foreground">
          Teachers see the <strong className="font-medium text-foreground">active</strong> published schedule for
          this year, term, and level. Publishing a new version archives the previous one.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[min(100%,280px)] flex-1 sm:max-w-md">
            <Select
              label="Published schedule"
              options={
                scheduleOptions.length
                  ? scheduleOptions
                  : [{ value: "", label: "No schedules found" }]
              }
              value={selectedId}
              disabled={!scheduleOptions.length}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              label="Show"
              options={[
                { value: "active", label: "Active" },
                { value: "archived", label: "Archived" },
                { value: "all", label: "All" },
              ]}
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
            />
          </div>
          <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-medium transition-ui ${
                viewMode === "class"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setViewMode("class")}
            >
              By class
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-medium transition-ui ${
                viewMode === "teacher"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setViewMode("teacher")}
            >
              By teacher
            </button>
          </div>
          {viewMode === "class" ? (
            <div className="min-w-[200px] flex-1 sm:max-w-xs">
              <Select
                label="Class"
                options={classOptions}
                value={classId}
                disabled={!classOptions.length}
                onChange={(e) => setClassId(e.target.value)}
              />
            </div>
          ) : (
            <div className="min-w-[200px] flex-1 sm:max-w-xs">
              <Select
                label="Teacher"
                options={teacherOptions}
                value={teacherId}
                disabled={!teacherOptions.length}
                onChange={(e) => setTeacherId(e.target.value)}
              />
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            className="h-10 shrink-0"
            loading={browseQ.isFetching || gridQ.isFetching}
            onClick={() => {
              void browseQ.refetch();
              void gridQ.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {selectedItem && overviewQ.data ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {selectedItem.isActive ? (
              <Badge tone="success">Live for teachers</Badge>
            ) : (
              <Badge tone="neutral">
                <Archive className="mr-1 inline h-3 w-3" />
                Archived
              </Badge>
            )}
            <span className="text-muted-foreground">v{selectedItem.version}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{overviewQ.data.stats.entryCount} lessons</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{overviewQ.data.stats.classCount} classes</span>
            {selectedItem.publishedAt ? (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  Published {new Date(selectedItem.publishedAt).toLocaleDateString()}
                  {overviewQ.data.publishedByName ? ` by ${overviewQ.data.publishedByName}` : ""}
                </span>
              </>
            ) : null}
            {logQ.data && logQ.data.length > 0 ? (
              <details className="ml-auto text-xs">
                <summary className="cursor-pointer font-medium text-brand hover:underline">
                  <History className="mr-1 inline h-3.5 w-3.5" />
                  History ({logQ.data.length})
                </summary>
                <ul className="mt-1 max-w-md space-y-0.5 text-muted-foreground">
                  {logQ.data.map((entry) => (
                    <li key={entry.id}>
                      v{entry.version} · {entry.entryCount} entries ·{" "}
                      {new Date(entry.publishedAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-3 min-h-0 flex-1">
        <AsyncContent
          status={browseStatus}
          loading={
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Loading schedules…
            </div>
          }
          error={
            <ErrorState
              message={browseQ.error instanceof Error ? browseQ.error.message : "Failed to load schedules"}
              onRetry={() => void browseQ.refetch()}
            />
          }
        >
          {browseQ.data?.length === 0 ? (
            <EmptyState
              title="No published timetables"
              description="Publish a draft from the Setup, By class, or Publish tabs for this year, term, and level."
            />
          ) : (
            <AsyncContent
              status={gridStatus}
              loading={
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  Loading timetable…
                </div>
              }
              error={
                <ErrorState
                  message={gridQ.error instanceof Error ? gridQ.error.message : "Failed to load grid"}
                  onRetry={() => void gridQ.refetch()}
                />
              }
            >
              {gridQ.data ? (
                <div className="w-full overflow-x-auto">
                  <TimetableReadOnlyGrid grid={gridQ.data} viewMode={viewMode} />
                </div>
              ) : null}
            </AsyncContent>
          )}
        </AsyncContent>
      </div>
    </div>
  );
}

function scheduleLabel(item: TimetableBrowseItem): string {
  const status = item.isActive ? "Active" : "Archived";
  return `${item.name} (${status} · v${item.version})`;
}
