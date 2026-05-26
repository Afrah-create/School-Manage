"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Camera } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { updateStudentSchema } from "@uganda-cbc-sms/shared";
import type { Student } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import { apiGet, apiPatch, apiUpload } from "@/lib/api";
import { formatDateForInput } from "@/lib/dates";
import { resolveUploadUrl } from "@/lib/media";

type ClassOpt = { id: string; name: string; stream: string };
type ComboOpt = { id: string; code: string; name: string };

type EditValues = z.infer<typeof updateStudentSchema>;

export function studentToFormValues(st: Student): EditValues {
  return {
    fullName: st.fullName,
    dateOfBirth: formatDateForInput(st.dateOfBirth),
    gender: st.gender,
    guardianName: st.guardianName,
    guardianContact: st.guardianContact,
    guardianEmail: st.guardianEmail ?? "",
    address: st.address ?? "",
    previousSchool: st.previousSchool ?? "",
    classId: st.classId ?? "",
    combinationId: st.combinationId ?? "",
    status: st.status,
    transferReason: st.transferReason ?? "",
  };
}

export function StudentEditForm({
  studentId,
  initial,
  onSaved,
  onCancel,
  embedded,
}: {
  studentId: string;
  initial: Student;
  onSaved?: (student: Student) => void;
  onCancel?: () => void;
  /** When true, omit outer card wrappers are tighter for modals */
  embedded?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [combos, setCombos] = useState<ComboOpt[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoOk, setPhotoOk] = useState<string | null>(null);

  const form = useForm<EditValues>({
    resolver: zodResolver(updateStudentSchema),
    defaultValues: studentToFormValues(initial),
  });

  useEffect(() => {
    form.reset(studentToFormValues(initial));
    setPhotoUrl(initial.photoUrl ?? null);
    setPreviewUrl(null);
  }, [initial, form]);

  useEffect(() => {
    void (async () => {
      try {
        const [c, k] = await Promise.all([
          apiGet<ClassOpt[]>("/academic/classes"),
          apiGet<ComboOpt[]>("/academic/combinations"),
        ]);
        setClasses(c);
        setCombos(k);
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : "Failed to load lookups");
      }
    })();
  }, []);

  const displayPhoto = previewUrl ?? resolveUploadUrl(photoUrl);

  const onPickPhoto = () => fileRef.current?.click();

  const onPhotoChange = async (file: File | undefined) => {
    if (!file) return;
    setPhotoOk(null);
    setSubmitErr(null);
    const local = URL.createObjectURL(file);
    setPreviewUrl(local);
    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await apiUpload<{ photoUrl: string }>(
        `/students/${encodeURIComponent(studentId)}/photo`,
        fd,
      );
      setPhotoUrl(res.photoUrl ?? null);
      setPreviewUrl(null);
      setPhotoOk("Profile photo updated.");
    } catch (e) {
      setPreviewUrl(null);
      setSubmitErr(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setPhotoBusy(false);
      URL.revokeObjectURL(local);
    }
  };

  const onSubmit = async (values: EditValues) => {
    setSubmitErr(null);
    setSaving(true);
    try {
      const updated = await apiPatch<Student>(`/students/${encodeURIComponent(studentId)}`, {
        fullName: values.fullName?.trim(),
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        guardianName: values.guardianName?.trim(),
        guardianContact: values.guardianContact?.trim(),
        guardianEmail: values.guardianEmail?.trim() || null,
        address: values.address?.trim() || null,
        previousSchool: values.previousSchool?.trim() || null,
        classId: values.classId?.trim() || null,
        combinationId: values.combinationId?.trim() || null,
        status: values.status,
        transferReason: values.transferReason?.trim() || null,
      });
      if (onSaved) {
        onSaved({ ...updated, photoUrl: photoUrl ?? updated.photoUrl });
      } else {
        router.push(`/admin/students/${studentId}`);
      }
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else router.push(`/admin/students/${studentId}`);
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

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      {loadErr ? <Alert tone="error">{loadErr}</Alert> : null}
      {submitErr ? <Alert tone="error">{submitErr}</Alert> : null}
      {photoOk ? <Alert tone="success">{photoOk}</Alert> : null}

      {wrap(
        "Profile photo",
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            {displayPhoto ? (
              <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-border">
                <Image src={displayPhoto} alt="" fill className="object-cover" sizes="96px" unoptimized />
              </div>
            ) : (
              <StudentAvatar fullName={form.watch("fullName") || initial.fullName} photoUrl={null} size="lg" className="!rounded-xl" />
            )}
          </div>
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <p className="text-sm text-muted-foreground">
              Student profile photo (JPEG or PNG, max {process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? "2"} MB).
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              onChange={(e) => void onPhotoChange(e.target.files?.[0])}
            />
            <Button type="button" variant="secondary" loading={photoBusy} onClick={onPickPhoto}>
              <Camera className="mr-2 h-4 w-4" />
              Upload photo
            </Button>
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
                value={formatDateForInput(field.value)}
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
                value={field.value ?? "male"}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
          <Controller
            name="status"
            control={form.control}
            render={({ field }) => (
              <Select
                label="Enrollment status"
                options={[
                  { value: "active", label: "Active" },
                  { value: "transferred", label: "Transferred" },
                  { value: "withdrawn", label: "Withdrawn" },
                ]}
                value={field.value ?? "active"}
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
          <Input label="Guardian email (optional)" type="email" {...form.register("guardianEmail")} />
          <Input label="Previous school (optional)" {...form.register("previousSchool")} />
          <div className="md:col-span-2">
            <label htmlFor="address" className="mb-1 block text-sm font-medium text-foreground">
              Address (optional)
            </label>
            <textarea
              id="address"
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-ui placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              {...form.register("address")}
            />
          </div>
        </div>,
      )}

      {wrap(
        "Academic placement",
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="classId"
            control={form.control}
            rules={{ validate: (v) => (v?.trim() ? true : "Choose a class") }}
            render={({ field }) => (
              <Select
                label="Class"
                options={[
                  { value: "", label: "Select class…" },
                  ...classes.map((x) => ({
                    value: x.id,
                    label: `${x.name} ${x.stream}`.trim(),
                  })),
                ]}
                value={field.value ?? ""}
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
                  ...combos.map((x) => ({ value: x.id, label: `${x.code} — ${x.name}` })),
                ]}
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
          <div className="md:col-span-2">
            <label htmlFor="transferReason" className="mb-1 block text-sm font-medium text-foreground">
              Transfer / withdrawal notes (optional)
            </label>
            <textarea
              id="transferReason"
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-ui placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              {...form.register("transferReason")}
            />
          </div>
        </div>,
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
