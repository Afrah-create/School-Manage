"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { TeacherWeekTimetable } from "@/components/timetable/TeacherWeekTimetable";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { useTeacherWeek } from "@/hooks/useTimetable";
import { queryStatus } from "@/lib/queryStatus";

export default function ClassTeacherTimetablePage() {
  const weekQ = useTeacherWeek();
  const status = queryStatus(weekQ);

  return (
    <PageWrapper title="My timetable" description="Your published weekly teaching schedule for the current term.">
      <AsyncContent
        status={status}
        loading={<TableSkeleton rows={4} cols={5} />}
        error={
          <ErrorState
            message={weekQ.error instanceof Error ? weekQ.error.message : "Failed to load timetable"}
            onRetry={() => void weekQ.refetch()}
          />
        }
      >
        <TeacherWeekTimetable week={weekQ.data} />
      </AsyncContent>
    </PageWrapper>
  );
}
