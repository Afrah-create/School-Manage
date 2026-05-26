"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Camera } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { createStudentSchema } from "@uganda-cbc-sms/shared";
import type { AcademicYear, SchoolClass } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import { useClassEnrollmentSummary } from "@/hooks/useStudentsBrowse";
import { apiGet, apiPost, apiUpload } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

type Form = z.infer<typeof createStudentSchema>;

type ComboOpt = { id: string; code: string; name: string };

const textareaClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-ui placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

export function EnrolmentForm({
  onCreated,
  onCancel,
  embedded,
}: {
  onCreated?: (id: string) => void;
  onCancel?: () => void;
  embedded?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      gender: "male",
      guardianName: "",
      guardianContact: "",
      guardianEmail: "",
      address: "",
      previousSchool: "",
      classId: "",
      combinationId: null,
    },
  });

  const yearsQ = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
  });

  const activeYearId = useMemo(() => {
    const years = yearsQ.data ?? [];
    return years.find((y) => y.isActive)?.id ?? years[0]?.id ?? "";
  }, [yearsQ.data]);

  const classesQ = useQuery({
    queryKey: ["academic-classes", "enrol", activeYearId],
    queryFn: () => apiGet<SchoolClass[]>("/academic/classes"),
    enabled: Boolean(activeYearId),
  });

  const combosQ = useQuery({
    queryKey: ["academic-combinations"],
    queryFn: () => apiGet<ComboOpt[]>("/academic/combinations"),
  });

  const summaryQ = useClassEnrollmentSummary();

  const classesForYear = useMemo(() => {
    const all = classesQ.data ?? [];
    if (!activeYearId) return all;
    return all.filter((c) => c.academicYearId === activeYearId);
  }, [classesQ.data, activeYearId]);

  const classOptions = useMemo(() => {
    const counts = new Map((summaryQ.data ?? []).map((c) => [c.classId, c.activeCount]));
    return classesForYear.map((c) => {
      const n = counts.get(c.id);
      const label = `${c.name}${c.stream ? ` · ${c.stream}` : ""}`;
      return {
        value: c.id,
        label: n != null ? `${label} (${n} enrolled)` : label,
      };
    });
  }, [classesForYear, summaryQ.data]);

  useEffect(() => {
    if (!classesForYear.length) return;
    const current = form.getValues("classId");
    if (!current || !classesForYear.some((c) => c.id === current)) {
      form.setValue("classId", classesForYear[0]!.id, { shouldValidate: true });
    }
  }, [classesForYear, form]);

  useEffect(() => {
    if (classesQ.isError) {
      setLoadErr(classesQ.error instanceof Error ? classesQ.error.message : "Failed to load classes");
    } else if (combosQ.isError) {
      setLoadErr(combosQ.error instanceof Error ? combosQ.error.message : "Failed to load combinations");
    } else {
      setLoadErr(null);
    }
  }, [classesQ.isError, classesQ.error, combosQ.isError, combosQ.error]);

  const fullName = form.watch("fullName");
  const displayName = fullName.trim() || "New learner";

  const onPickPhoto = () => fileRef.current?.click();

  const onPhotoSelected = (file: File | undefined) => {
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPendingPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setSubmitErr(null);
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPendingPhoto(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = async (values: Form) => {
    setSubmitErr(null);
    setSaving(true);
    try {
      const payload = {
        ...values,
        fullName: values.fullName.trim(),
        guardianName: values.guardianName.trim(),
        guardianContact: values.guardianContact.trim(),
        guardianEmail: values.guardianEmail?.trim() || null,
        address: values.address?.trim() || null,
        previousSchool: values.previousSchool?.trim() || null,
        combinationId:
          values.combinationId && String(values.combinationId).length > 0
            ? values.combinationId
            : undefined,
      };
      const row = await apiPost<{ id: string }>("/students", payload);

      if (pendingPhoto) {
        const fd = new FormData();
        fd.append("photo", pendingPhoto);
        await apiUpload<{ photoUrl: string }>(`/students/${encodeURIComponent(row.id)}/photo`, fd);
      }

      onCreated?.(row.id);
      if (!onCreated) {
        form.reset({
          fullName: "",
          dateOfBirth: "",
          gender: "male",
          guardianName: "",
          guardianContact: "",
          guardianEmail: "",
          address: "",
          previousSchool: "",
          classId: values.classId,
          combinationId: null,
        });
        clearPhoto();
      }
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : "Enrolment failed");
    } finally {
      setSaving(false);
    }
  };

  const wrap = (title: string, children: ReactNode) =>
    embedded ? (
      <div className="space-y-4 rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {children}
      </div>
    ) : (
      <Card title={title}>{children}</Card>
    );

  const lookupsLoading = classesQ.isLoading || combosQ.isLoading;

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      {loadErr ? <Alert tone="error">{loadErr}</Alert> : null}
      {submitErr ? <Alert tone="error">{submitErr}</Alert> : null}

      {wrap(
        "Profile photo (optional)",
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            {photoPreview ? (
              <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-border">
                <Image src={photoPreview} alt="" fill className="object-cover" sizes="96px" unoptimized />
              </div>
            ) : (
              <StudentAvatar fullName={displayName} photoUrl={null} size="lg" className="!rounded-xl" />
            )}
          </div>
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <p className="text-sm text-muted-foreground">
              Add a photo now or upload later from the student profile. JPEG or PNG, max{" "}
              {process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? "2"} MB.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              onChange={(e) => onPhotoSelected(e.target.files?.[0])}
            />
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button type="button" variant="secondary" onClick={onPickPhoto}>
                <Camera className="mr-2 h-4 w-4" />
                Choose photo
              </Button>
              {pendingPhoto ? (
                <Button type="button" variant="secondary" onClick={clearPhoto}>
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        </div>,
      )}

      {wrap(
        "Student details",
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Full name"
            {...form.register("fullName")}
            error={form.formState.errors.fullName?.message}
          />
          <Controller
            name="dateOfBirth"
            control={form.control}
            render={({ field }) => (
              <Input
                label="Date of birth"
                type="date"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                error={form.formState.errors.dateOfBirth?.message}
              />
            )}
          />
          <Controller
            name="gender"
            control={form.control}
            render={({ field }) => (
              <Select
                label="Gender"
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                ]}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
        </div>,
      )}

      {wrap(
        "Guardian & contact",
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Guardian name"
            {...form.register("guardianName")}
            error={form.formState.errors.guardianName?.message}
          />
          <Input
            label="Guardian contact"
            {...form.register("guardianContact")}
            error={form.formState.errors.guardianContact?.message}
          />
          <Input
            label="Guardian email (optional)"
            type="email"
            {...form.register("guardianEmail")}
            error={form.formState.errors.guardianEmail?.message}
          />
          <Input
            label="Previous school (optional)"
            {...form.register("previousSchool")}
            error={form.formState.errors.previousSchool?.message}
          />
          <div className="md:col-span-2">
            <label htmlFor="enrol-address" className="mb-1 block text-sm font-medium text-foreground">
              Address (optional)
            </label>
            <textarea id="enrol-address" rows={3} className={textareaClass} {...form.register("address")} />
          </div>
        </div>,
      )}

      {wrap(
        "Academic placement",
        <div className="grid gap-4 md:grid-cols-2">
          {activeYearId ? (
            <p className="md:col-span-2 text-sm text-muted-foreground">
              Classes shown for the active academic year. Change the active year under Academic if needed.
            </p>
          ) : null}
          <Controller
            name="classId"
            control={form.control}
            render={({ field }) => (
              <Select
                label="Class"
                options={
                  classOptions.length
                    ? classOptions
                    : [{ value: "", label: lookupsLoading ? "Loading classes…" : "No classes available" }]
                }
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                error={form.formState.errors.classId?.message}
              />
            )}
          />
          <Controller
            name="combinationId"
            control={form.control}
            render={({ field }) => (
              <Select
                label="A-Level combination (optional)"
                options={[
                  { value: "", label: "—" },
                  ...(combosQ.data ?? []).map((x) => ({
                    value: x.id,
                    label: `${x.code} — ${x.name}`,
                  })),
                ]}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
        </div>,
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={saving} disabled={lookupsLoading || classOptions.length === 0}>
          Enrol student
        </Button>
      </div>
    </form>
  );
}
