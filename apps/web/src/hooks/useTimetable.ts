"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CloneTimetableTemplateInput,
  TimetableClassSubjectOption,
  TimetableDaysBulkInput,
  TimetableEntriesBulkSaveInput,
  TimetableGridView,
  TimetablePeriod,
  TimetablePeriodsBulkInput,
  TimetableBrowseItem,
  TimetableBrowseQuery,
  TimetablePublicationLogEntry,
  TimetablePublishInput,
  TimetableSlotOccupancyView,
  TimetableTemplate,
  TimetableTemplateOverview,
  TimetableTemplateQuery,
  TimetableValidateResult,
  TeacherTodayView,
  TeacherWeekView,
} from "@uganda-cbc-sms/shared";
import type { AcademicLevel } from "@/lib/academicLevel";
import { apiGet, apiPost, apiPut } from "@/lib/api";

export type TimetableScope = {
  academicYearId: string;
  termId: string;
  level: AcademicLevel;
};

export function useTimetableBrowse(filters: TimetableBrowseQuery) {
  const qp = new URLSearchParams();
  if (filters.academicYearId) qp.set("academicYearId", filters.academicYearId);
  if (filters.termId) qp.set("termId", filters.termId);
  if (filters.level) qp.set("level", filters.level);
  if (filters.status) qp.set("status", filters.status);
  const qs = qp.toString();
  return useQuery({
    queryKey: ["timetable-browse", filters],
    queryFn: () => apiGet<TimetableBrowseItem[]>(`/timetable/browse${qs ? `?${qs}` : ""}`),
    placeholderData: keepPreviousData,
  });
}

export function useTimetableOverview(templateId: string) {
  return useQuery({
    queryKey: ["timetable-overview", templateId],
    queryFn: () =>
      apiGet<TimetableTemplateOverview>(
        `/timetable/templates/${encodeURIComponent(templateId)}/overview`,
      ),
    enabled: Boolean(templateId),
  });
}

export function useTimetableTemplates(scope: TimetableScope) {
  const qp = new URLSearchParams({
    academicYearId: scope.academicYearId,
    termId: scope.termId,
    level: scope.level,
  });
  return useQuery({
    queryKey: ["timetable-templates", scope],
    queryFn: () => apiGet<TimetableTemplate[]>(`/timetable/templates?${qp.toString()}`),
    enabled: Boolean(scope.academicYearId && scope.termId),
    placeholderData: keepPreviousData,
  });
}

export function useTimetableDraft(scope: TimetableScope) {
  const qp = new URLSearchParams({
    academicYearId: scope.academicYearId,
    termId: scope.termId,
    level: scope.level,
  });
  return useQuery({
    queryKey: ["timetable-draft", scope],
    queryFn: () => apiGet<TimetableTemplate>(`/timetable/templates/draft?${qp.toString()}`),
    enabled: Boolean(scope.academicYearId && scope.termId),
    placeholderData: keepPreviousData,
  });
}

export function useTimetablePeriods(templateId: string) {
  return useQuery({
    queryKey: ["timetable-periods", templateId],
    queryFn: () => apiGet<TimetablePeriod[]>(`/timetable/templates/${encodeURIComponent(templateId)}/periods`),
    enabled: Boolean(templateId),
  });
}

export function useTimetableDays(templateId: string) {
  return useQuery({
    queryKey: ["timetable-days", templateId],
    queryFn: () =>
      apiGet<Array<{ id: string; dayOfWeek: number; isSchoolDay: boolean }>>(
        `/timetable/templates/${encodeURIComponent(templateId)}/days`,
      ),
    enabled: Boolean(templateId),
  });
}

export function useTimetableClassSubjects(templateId: string, classId: string) {
  return useQuery({
    queryKey: ["timetable-class-subjects", templateId, classId],
    queryFn: () =>
      apiGet<TimetableClassSubjectOption[]>(
        `/timetable/templates/${encodeURIComponent(templateId)}/class-subjects?classId=${encodeURIComponent(classId)}`,
      ),
    enabled: Boolean(templateId && classId),
  });
}

export function useTimetableSlotOccupancy(templateId: string, excludeClassId: string) {
  return useQuery({
    queryKey: ["timetable-slot-occupancy", templateId, excludeClassId],
    queryFn: () =>
      apiGet<TimetableSlotOccupancyView>(
        `/timetable/templates/${encodeURIComponent(templateId)}/slot-occupancy?excludeClassId=${encodeURIComponent(excludeClassId)}`,
      ),
    enabled: Boolean(templateId && excludeClassId),
    placeholderData: keepPreviousData,
  });
}

export function useTimetableClassGrid(templateId: string, classId: string) {
  return useQuery({
    queryKey: ["timetable-grid-class", templateId, classId],
    queryFn: () =>
      apiGet<TimetableGridView>(
        `/timetable/templates/${encodeURIComponent(templateId)}/grid?view=class&classId=${encodeURIComponent(classId)}`,
      ),
    enabled: Boolean(templateId && classId),
    placeholderData: keepPreviousData,
  });
}

export function useTimetableTeacherGrid(templateId: string, teacherId: string) {
  return useQuery({
    queryKey: ["timetable-grid-teacher", templateId, teacherId],
    queryFn: () =>
      apiGet<TimetableGridView>(
        `/timetable/templates/${encodeURIComponent(templateId)}/grid?view=teacher&teacherId=${encodeURIComponent(teacherId)}`,
      ),
    enabled: Boolean(templateId && teacherId),
    placeholderData: keepPreviousData,
  });
}

export function useTimetableValidation(templateId: string, enabled = false) {
  return useQuery({
    queryKey: ["timetable-validate", templateId],
    queryFn: () =>
      apiPost<TimetableValidateResult>(
        `/timetable/templates/${encodeURIComponent(templateId)}/validate`,
        {},
      ),
    enabled: Boolean(templateId) && enabled,
  });
}

export function useTimetablePublicationLog(templateId: string) {
  return useQuery({
    queryKey: ["timetable-publication-log", templateId],
    queryFn: () =>
      apiGet<TimetablePublicationLogEntry[]>(
        `/timetable/templates/${encodeURIComponent(templateId)}/publication-log`,
      ),
    enabled: Boolean(templateId),
  });
}

export function useTeacherWeek(weekStart?: string) {
  const qp = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
  return useQuery({
    queryKey: ["timetable-my-week", weekStart ?? "current"],
    queryFn: () => apiGet<TeacherWeekView>(`/timetable/my-week${qp}`),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function useTeacherToday() {
  return useQuery({
    queryKey: ["timetable-today"],
    queryFn: () => apiGet<TeacherTodayView>("/timetable/today"),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function mondayOfWeekIso(ref: Date = new Date()): string {
  const d = new Date(ref);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function useTimetableMutations(scope: TimetableScope) {
  const qc = useQueryClient();

  const invalidateAll = async (templateId?: string) => {
    await qc.invalidateQueries({ queryKey: ["timetable-templates", scope] });
    await qc.invalidateQueries({ queryKey: ["timetable-draft", scope] });
    if (templateId) {
      await qc.invalidateQueries({ queryKey: ["timetable-periods", templateId] });
      await qc.invalidateQueries({ queryKey: ["timetable-days", templateId] });
      await qc.invalidateQueries({ queryKey: ["timetable-grid-class", templateId] });
      await qc.invalidateQueries({ queryKey: ["timetable-grid-teacher", templateId] });
      await qc.invalidateQueries({ queryKey: ["timetable-validate", templateId] });
      await qc.invalidateQueries({ queryKey: ["timetable-publication-log", templateId] });
    }
  };

  const savePeriods = useMutation({
    mutationFn: ({ templateId, payload }: { templateId: string; payload: TimetablePeriodsBulkInput }) =>
      apiPut<TimetablePeriod[]>(
        `/timetable/templates/${encodeURIComponent(templateId)}/periods`,
        payload,
      ),
    onSuccess: (_, v) => void invalidateAll(v.templateId),
  });

  const saveDays = useMutation({
    mutationFn: ({ templateId, payload }: { templateId: string; payload: TimetableDaysBulkInput }) =>
      apiPut(`/timetable/templates/${encodeURIComponent(templateId)}/days`, payload),
    onSuccess: (_, v) => void invalidateAll(v.templateId),
  });

  const saveClassGrid = useMutation({
    mutationFn: ({
      templateId,
      classId,
      payload,
    }: {
      templateId: string;
      classId: string;
      payload: TimetableEntriesBulkSaveInput;
    }) =>
      apiPut<TimetableGridView>(
        `/timetable/templates/${encodeURIComponent(templateId)}/grid/class/${encodeURIComponent(classId)}`,
        payload,
      ),
    onSuccess: (_, v) => {
      void invalidateAll(v.templateId);
      void qc.invalidateQueries({ queryKey: ["timetable-slot-occupancy", v.templateId] });
    },
  });

  const validate = useMutation({
    mutationFn: (templateId: string) =>
      apiPost<TimetableValidateResult>(
        `/timetable/templates/${encodeURIComponent(templateId)}/validate`,
        {},
      ),
  });

  const publish = useMutation({
    mutationFn: ({ templateId, payload }: { templateId: string; payload: TimetablePublishInput }) =>
      apiPost<TimetableTemplate>(
        `/timetable/templates/${encodeURIComponent(templateId)}/publish`,
        payload,
      ),
    onSuccess: () => void invalidateAll(),
  });

  const clone = useMutation({
    mutationFn: ({
      sourceTemplateId,
      payload,
    }: {
      sourceTemplateId: string;
      payload: Omit<CloneTimetableTemplateInput, "sourceTemplateId">;
    }) =>
      apiPost<TimetableTemplate>(
        `/timetable/templates/${encodeURIComponent(sourceTemplateId)}/clone`,
        payload,
      ),
    onSuccess: () => void invalidateAll(),
  });

  return { savePeriods, saveDays, saveClassGrid, validate, publish, clone, invalidateAll };
}
