"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { SubjectTeacherDashboardContent } from "@/components/subject-teacher/SubjectTeacherDashboardContent";
import { DashboardSkeleton } from "@/components/layout/shells/DashboardScaffold";
import { useMyTeachingScope } from "@/hooks/useMyTeachingScope";
import { apiGet } from "@/lib/api";
import { manualStatus } from "@/lib/queryStatus";
import type { PaginatedStudents } from "@uganda-cbc-sms/shared";

type CbcRow = { submitted?: boolean; id: string };

export default function SubjectTeacherDashboardPage() {
  const scope = useMyTeachingScope();
  const previewClassId = scope.primarySubjectClassId;
  const previewSlot = scope.subjectSlots[0] ?? null;

  const studentsQ = useQuery({
    queryKey: ["subject-teacher-dashboard-students", previewClassId],
    queryFn: () =>
      apiGet<PaginatedStudents>(
        `/students?classId=${encodeURIComponent(previewClassId!)}&status=active&limit=10&page=1&sort=name`,
      ),
    enabled: Boolean(previewClassId),
  });

  const cbcQ = useQuery({
    queryKey: ["cbc-dashboard", scope.yearId, scope.termId],
    queryFn: async () => {
      if (!scope.yearId || !scope.termId) {
        return [] as CbcRow[];
      }
      return apiGet<CbcRow[]>(
        `/assessments/cbc?termId=${encodeURIComponent(scope.termId)}&yearId=${encodeURIComponent(scope.yearId)}`,
      );
    },
    enabled: Boolean(scope.yearId && scope.termId && scope.subjectSlots.length > 0),
  });

  const cbcRows = cbcQ.data ?? [];
  const cbcSubmitted = cbcRows.filter((r) => r.submitted).length;
  const cbcPending = cbcRows.length - cbcSubmitted;

  const uniqueClassCount = useMemo(() => {
    const ids = new Set(scope.subjectSlots.map((s) => s.classId));
    return ids.size;
  }, [scope.subjectSlots]);

  const students = useMemo(() => studentsQ.data?.items ?? [], [studentsQ.data?.items]);
  const termLabel = scope.termId ? `Term ${scope.activeTerm?.termNumber ?? ""}` : "Not set";

  const loadStudents = Boolean(previewClassId);
  const loadCbc = Boolean(scope.yearId && scope.termId && scope.subjectSlots.length > 0);

  const status = manualStatus({
    loading:
      scope.isLoading || (loadStudents && studentsQ.isPending) || (loadCbc && cbcQ.isPending),
    error: scope.error ?? studentsQ.error ?? cbcQ.error,
    data: scope.hasAssignments ? scope.subjectSlots : scope.myClasses,
  });

  const isFetching =
    scope.isLoading ||
    (loadStudents && studentsQ.isFetching) ||
    (loadCbc && cbcQ.isFetching);

  const errorMessage =
    (scope.error ?? studentsQ.error ?? cbcQ.error) instanceof Error
      ? (scope.error ?? studentsQ.error ?? cbcQ.error)!.message
      : "Failed to load";

  const studentPreviews = useMemo(
    () =>
      students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        studentNumber: s.studentNumber,
      })),
    [students],
  );

  return (
    <AsyncContent
      status={status}
      isFetching={isFetching}
      loading={<DashboardSkeleton />}
      error={<ErrorState message={errorMessage} onRetry={() => void scope.refetch()} />}
    >
      <SubjectTeacherDashboardContent
        previewSlot={previewSlot}
        yearName={scope.activeYear?.name}
        termLabel={termLabel}
        subjectSlotCount={scope.subjectSlots.length}
        uniqueClassCount={uniqueClassCount}
        cbcTotal={cbcRows.length}
        cbcSubmitted={cbcSubmitted}
        cbcPending={cbcPending}
        students={studentPreviews}
        studentsTotal={studentsQ.data?.total}
        myClasses={scope.myClasses}
        subjectSlots={scope.subjectSlots}
        homeroomClasses={scope.homeroomClasses}
      />
    </AsyncContent>
  );
}
