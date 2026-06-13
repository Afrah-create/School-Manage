"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { ClassTeacherDashboardContent } from "@/components/class-teacher/ClassTeacherDashboardContent";
import { DashboardSkeleton } from "@/components/layout/shells/DashboardScaffold";
import { useMyTeachingScope } from "@/hooks/useMyTeachingScope";
import { useTeacherToday } from "@/hooks/useTimetable";
import { apiGet } from "@/lib/api";
import { manualStatus } from "@/lib/queryStatus";
import type { PaginatedStudents } from "@uganda-cbc-sms/shared";

type AttRow = { status?: string; student_name?: string; student_number?: string };

export default function ClassTeacherDashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const scope = useMyTeachingScope();

  const homeroomClass = scope.homeroomClass;
  const previewSlot = scope.subjectSlots[0] ?? null;
  const loadAttendance = Boolean(homeroomClass?.classId);

  const studentsQ = useQuery({
    queryKey: ["class-teacher-dashboard-students", scope.primaryDashboardClassId],
    queryFn: () =>
      apiGet<PaginatedStudents>(
        `/students?classId=${encodeURIComponent(scope.primaryDashboardClassId!)}&status=active&limit=100&page=1&sort=name`,
      ),
    enabled: Boolean(scope.primaryDashboardClassId),
  });

  const todayLessonsQ = useTeacherToday();

  const attendanceQ = useQuery({
    queryKey: ["attendance-today", homeroomClass?.classId, today],
    queryFn: () =>
      apiGet<AttRow[]>(
        `/attendance?classId=${encodeURIComponent(homeroomClass!.classId)}&date=${encodeURIComponent(today)}`,
      ),
    enabled: loadAttendance,
  });

  const students = useMemo(() => studentsQ.data?.items ?? [], [studentsQ.data?.items]);
  const att = attendanceQ.data ?? [];
  const absentees = att.filter((a) => a.status === "absent");

  const todayLessons = useMemo(() => {
    const lessons = todayLessonsQ.data?.lessons ?? [];
    return [...lessons].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [todayLessonsQ.data]);

  const scopeReady = !scope.isLoading;
  const studentsPending = Boolean(scope.primaryDashboardClassId) && studentsQ.isPending;
  const attendancePending = loadAttendance && attendanceQ.isPending;

  const status = manualStatus({
    loading: !scopeReady || studentsPending || attendancePending,
    error: scope.error ?? studentsQ.error ?? attendanceQ.error,
    data: scope.hasAssignments ? scope.subjectSlots : scope.myClasses,
  });

  const isFetching =
    scope.isLoading || studentsQ.isFetching || (loadAttendance && attendanceQ.isFetching);

  const errorMessage =
    (scope.error ?? studentsQ.error ?? attendanceQ.error) instanceof Error
      ? (scope.error ?? studentsQ.error ?? attendanceQ.error)!.message
      : "Failed to load";

  const homeroomLabel = homeroomClass ? scope.classLabel(homeroomClass) : null;

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
      <ClassTeacherDashboardContent
        today={today}
        homeroomClass={homeroomClass}
        homeroomLabel={homeroomLabel}
        previewSlot={previewSlot}
        yearName={scope.activeYear?.name}
        subjectSlotCount={scope.subjectSlots.length}
        studentCount={students.length}
        absenteeCount={absentees.length}
        attendance={att}
        students={studentPreviews}
        todayLessons={todayLessons}
        myClasses={scope.myClasses}
        subjectSlots={scope.subjectSlots}
        homeroomClasses={scope.homeroomClasses}
      />
    </AsyncContent>
  );
}
