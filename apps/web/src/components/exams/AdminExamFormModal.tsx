"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm, type Control } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { createExamSchema, updateExamSchema } from "@uganda-cbc-sms/shared";
import type { AcademicYear, CreateExamInput, SchoolClass, Term, UpdateExamInput } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { ExamSubjectCheckboxList } from "@/components/exams/ExamSubjectCheckboxList";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { ExamDetail } from "@/hooks/useExams";
import { useExamAdminActions } from "@/hooks/useExams";
import { apiGet, getApiErrorMessage } from "@/lib/api";

type CreateForm = z.infer<typeof createExamSchema>;
type EditForm = z.infer<typeof updateExamSchema>;

type ClassSubjectRow = {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
};

type Props = {
  mode: "create" | "edit";
  open: boolean;
  onClose: () => void;
  exam?: ExamDetail;
  defaultYearId?: string;
  defaultTermId?: string;
  defaultClassId?: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function AdminExamFormModal({
  mode,
  open,
  onClose,
  exam,
  defaultYearId = "",
  defaultTermId = "",
  defaultClassId = "",
  onSuccess,
  onError,
}: Props) {
  const actions = useExamAdminActions();
  const isCreate = mode === "create";

  const yearsQ = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
    enabled: open,
  });
  const classesQ = useQuery({
    queryKey: ["academic-classes"],
    queryFn: () => apiGet<SchoolClass[]>("/academic/classes"),
    enabled: open,
  });

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createExamSchema),
    defaultValues: {
      name: "",
      academicYearId: defaultYearId,
      termId: defaultTermId,
      classId: defaultClassId,
      examDate: "",
      maxScore: 100,
      subjectIds: [],
    },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(updateExamSchema),
    defaultValues: {
      name: "",
      examDate: "",
      maxScore: 100,
      subjectIds: [],
    },
  });

  const years = yearsQ.data ?? [];
  const classes = classesQ.data ?? [];

  const createYearId = createForm.watch("academicYearId");
  const createClassId = createForm.watch("classId");

  const createTermsQ = useQuery({
    queryKey: ["academic-terms", "exam-form", createYearId],
    queryFn: () => apiGet<Term[]>(`/academic/terms?academicYearId=${encodeURIComponent(createYearId)}`),
    enabled: open && isCreate && Boolean(createYearId),
  });

  const classSubjectsQ = useQuery({
    queryKey: ["class-subjects", "exam-form", isCreate ? createClassId : exam?.classId, isCreate ? createYearId : exam?.academicYearId],
    queryFn: () =>
      apiGet<ClassSubjectRow[]>(
        `/academic/class-subjects?classId=${encodeURIComponent(isCreate ? createClassId : exam!.classId)}&academicYearId=${encodeURIComponent(isCreate ? createYearId : exam!.academicYearId)}`,
      ),
    enabled: open && (isCreate ? Boolean(createClassId && createYearId) : Boolean(exam?.classId && exam?.academicYearId)),
  });

  const createTerms = createTermsQ.data ?? [];
  const classesForCreate = useMemo(
    () => classes.filter((c) => c.academicYearId === createYearId),
    [classes, createYearId],
  );

  const examSubjectOptions = useMemo(() => {
    const rows = classSubjectsQ.data ?? [];
    const seen = new Set<string>();
    const out: ClassSubjectRow[] = [];
    for (const r of rows) {
      if (!r.subjectId || seen.has(r.subjectId)) continue;
      seen.add(r.subjectId);
      out.push(r);
    }
    return out.sort((a, b) => `${a.subjectCode}`.localeCompare(`${b.subjectCode}`));
  }, [classSubjectsQ.data]);

  useEffect(() => {
    if (!open || !isCreate) return;
    createForm.reset({
      name: "",
      academicYearId: defaultYearId || years[0]?.id || "",
      termId: defaultTermId || "",
      classId: defaultClassId || "",
      examDate: "",
      maxScore: 100,
      subjectIds: [],
    });
  }, [open, isCreate, defaultYearId, defaultTermId, defaultClassId, years, createForm]);

  useEffect(() => {
    if (!open || isCreate || !exam) return;
    editForm.reset({
      name: exam.name,
      examDate: exam.examDate ?? "",
      maxScore: exam.maxScore,
      subjectIds: exam.subjects.map((s) => s.subjectId),
    });
  }, [open, isCreate, exam, editForm]);

  useEffect(() => {
    if (!open || !isCreate || !createYearId || createTermsQ.isLoading) return;
    const termList = createTermsQ.data ?? [];
    const current = createForm.getValues("termId");
    if (!termList.length) {
      if (current) createForm.setValue("termId", "", { shouldValidate: false });
      return;
    }
    if (!current || !termList.some((t) => t.id === current)) {
      const pick =
        defaultTermId && termList.some((t) => t.id === defaultTermId) ? defaultTermId : termList[0]!.id;
      createForm.setValue("termId", pick, { shouldValidate: false });
    }
  }, [open, isCreate, createYearId, createTermsQ.data, createTermsQ.isLoading, defaultTermId, createForm]);

  useEffect(() => {
    if (!open || !isCreate || !createYearId) return;
    const valid = classes.filter((c) => c.academicYearId === createYearId);
    const current = createForm.getValues("classId");
    if (!current || !valid.some((c) => c.id === current)) {
      const pick =
        defaultClassId && valid.some((c) => c.id === defaultClassId) ? defaultClassId : valid[0]?.id ?? "";
      createForm.setValue("classId", pick, { shouldValidate: false });
      createForm.setValue("subjectIds", [], { shouldValidate: false });
    }
  }, [open, isCreate, createYearId, classes, defaultClassId, createForm]);

  const subjectsReady = isCreate ? Boolean(createYearId && createClassId) : Boolean(exam?.classId);
  const subjectsLoading = subjectsReady && classSubjectsQ.isLoading;
  const subjectsLoadError = classSubjectsQ.isError
    ? classSubjectsQ.error instanceof Error
      ? classSubjectsQ.error.message
      : "We couldn't load subjects for this class."
    : null;

  const onCreate = async (v: CreateForm) => {
    try {
      const created = await actions.create.mutateAsync(v);
      onSuccess(`"${created.name}" was created as a draft. Open it when teachers should enter marks.`);
      onClose();
    } catch (e) {
      onError(getApiErrorMessage(e));
    }
  };

  const onEdit = async (v: EditForm) => {
    if (!exam) return;
    try {
      const payload: UpdateExamInput = {
        ...v,
        examDate: v.examDate === "" ? null : v.examDate,
      };
      const updated = await actions.update.mutateAsync({ id: exam.id, body: payload });
      onSuccess(`"${updated.name}" was updated.`);
      onClose();
    } catch (e) {
      onError(getApiErrorMessage(e));
    }
  };

  const saving = isCreate ? actions.create.isPending : actions.update.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isCreate ? "Create exam" : "Edit draft exam"}>
      {isCreate ? (
        <form className="space-y-4" onSubmit={createForm.handleSubmit(onCreate)}>
          <Input
            label="Exam name"
            {...createForm.register("name")}
            error={createForm.formState.errors.name?.message}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Academic year"
              options={years.map((y) => ({ value: y.id, label: y.name }))}
              value={createForm.watch("academicYearId")}
              onChange={(e) => {
                const y = e.target.value;
                const nextClasses = classes.filter((c) => c.academicYearId === y);
                createForm.setValue("academicYearId", y);
                createForm.setValue("termId", "");
                createForm.setValue("classId", nextClasses[0]?.id ?? "");
                createForm.setValue("subjectIds", [], { shouldValidate: true });
              }}
            />
            <Select
              label="Term"
              options={
                createTerms.length
                  ? createTerms.map((t) => ({ value: t.id, label: `Term ${t.termNumber}` }))
                  : [{ value: "", label: "Select year first" }]
              }
              value={createForm.watch("termId")}
              onChange={(e) => createForm.setValue("termId", e.target.value)}
            />
          </div>
          <Select
            label="Class"
            options={
              classesForCreate.length
                ? classesForCreate.map((c) => ({
                    value: c.id,
                    label: `${c.name}${c.stream ? ` · ${c.stream}` : ""}`,
                  }))
                : [{ value: "", label: createYearId ? "No classes for this year" : "Select academic year first" }]
            }
            value={createForm.watch("classId")}
            onChange={(e) => {
              createForm.setValue("classId", e.target.value);
              createForm.setValue("subjectIds", [], { shouldValidate: true });
            }}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Exam date (optional)" type="date" {...createForm.register("examDate")} />
            <Input
              label="Maximum score"
              type="number"
              min={1}
              max={1000}
              {...createForm.register("maxScore")}
              error={createForm.formState.errors.maxScore?.message}
            />
          </div>
          <ExamSubjectCheckboxList
            control={createForm.control as unknown as Control<{ subjectIds: string[] }>}
            name="subjectIds"
            options={examSubjectOptions}
            ready={subjectsReady}
            loading={subjectsLoading}
            error={subjectsLoadError}
            fieldError={createForm.formState.errors.subjectIds?.message}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save draft
            </Button>
          </div>
        </form>
      ) : exam ? (
        <form className="space-y-4" onSubmit={editForm.handleSubmit(onEdit)}>
          <p className="text-sm text-muted-foreground">
            {exam.className}
            {exam.classStream ? ` · ${exam.classStream}` : ""} — only draft exams can be edited. Class, year, and term
            are fixed after creation.
          </p>
          <Input label="Exam name" {...editForm.register("name")} error={editForm.formState.errors.name?.message} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Exam date (optional)" type="date" {...editForm.register("examDate")} />
            <Input
              label="Maximum score"
              type="number"
              min={1}
              max={1000}
              {...editForm.register("maxScore")}
              error={editForm.formState.errors.maxScore?.message}
            />
          </div>
          <ExamSubjectCheckboxList
            control={editForm.control as unknown as Control<{ subjectIds: string[] }>}
            name="subjectIds"
            options={examSubjectOptions}
            ready={subjectsReady}
            loading={subjectsLoading}
            error={subjectsLoadError}
            fieldError={editForm.formState.errors.subjectIds?.message}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
