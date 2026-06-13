"use client";

import { useEffect, useMemo, useState } from "react";
import type { AcademicYear } from "@uganda-cbc-sms/shared";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OnboardingStatus, SchoolSettings } from "@uganda-cbc-sms/shared";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  KeyRound,
  Palette,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiGet, apiPatch, apiPost, getApiErrorMessage } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/authStore";

const STEPS = [
  { id: 1, title: "Password", icon: KeyRound },
  { id: 2, title: "School profile", icon: Building2 },
  { id: 3, title: "Academic year", icon: BookOpen },
  { id: 4, title: "Classes", icon: Users },
  { id: 5, title: "Grading", icon: Palette },
  { id: 6, title: "Staff", icon: Users },
  { id: 7, title: "Complete", icon: Sparkles },
] as const;

const slide = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

function currentYearDefaults() {
  const y = new Date().getFullYear();
  return {
    yearName: `${y} Academic Year`,
    yearStart: `${y}-02-01`,
    yearEnd: `${y + 1}-12-15`,
    termStart: `${y}-02-01`,
    termEnd: `${y}-05-15`,
  };
}

export function SchoolOnboardingWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const setToken = useAuthStore((s) => s.setToken);
  const defaults = useMemo(() => currentYearDefaults(), []);

  const statusQ = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: () => apiGet<OnboardingStatus>("/onboarding/status"),
  });

  const settingsQ = useQuery({
    queryKey: ["school-settings"],
    queryFn: () => apiGet<SchoolSettings>("/settings"),
  });

  const [step, setStep] = useState<number | null>(null);
  const activeStep = step ?? statusQ.data?.currentStep ?? 1;

  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [profileForm, setProfileForm] = useState({
    schoolName: "",
    motto: "",
    contactEmail: "",
    contactPhone: "",
    physicalAddress: "",
    primaryColor: "#1D4ED8",
    secondaryColor: "#0F172A",
  });
  const [yearForm, setYearForm] = useState({
    yearName: defaults.yearName,
    yearStart: defaults.yearStart,
    yearEnd: defaults.yearEnd,
    termNumber: "1" as "1" | "2" | "3",
    termStart: defaults.termStart,
    termEnd: defaults.termEnd,
  });
  const [yearId, setYearId] = useState("");
  const [classRows, setClassRows] = useState<
    Array<{ name: string; stream: string; level: "O_LEVEL" | "A_LEVEL" }>
  >([
    { name: "S1", stream: "Main", level: "O_LEVEL" },
    { name: "S2", stream: "Main", level: "O_LEVEL" },
  ]);
  const [staffRows, setStaffRows] = useState([
    { fullName: "", email: "", role: "headteacher" as const },
  ]);
  const [staffCredentials, setStaffCredentials] = useState<
    Array<{ fullName: string; email: string; role: string; temporaryPassword: string }>
  >([]);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });

  const passwordM = useMutation({
    mutationFn: () => {
      if (passwordForm.next !== passwordForm.confirm) {
        return Promise.reject(new Error("New passwords do not match."));
      }
      return apiPatch<{ token: string }>("/auth/change-password", {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      });
    },
    onSuccess: (data) => {
      setToken(data.token);
      updateUser({ forcePasswordChange: false });
      toast.success("Password updated.", "Security");
      invalidate();
      setStep(2);
    },
    onError: (e) => toast.error(getApiErrorMessage(e), "Could not change password"),
  });

  const profileM = useMutation({
    mutationFn: () => {
      if (!profileForm.schoolName.trim()) {
        return Promise.reject(new Error("School name is required."));
      }
      return apiPatch("/onboarding/settings", {
        schoolName: profileForm.schoolName.trim(),
        motto: profileForm.motto || null,
        contactEmail: profileForm.contactEmail || null,
        contactPhone: profileForm.contactPhone || null,
        physicalAddress: profileForm.physicalAddress || null,
        primaryColor: profileForm.primaryColor,
        secondaryColor: profileForm.secondaryColor,
      });
    },
    onSuccess: () => {
      toast.success("School profile saved.");
      invalidate();
      setStep(3);
    },
    onError: (e) => toast.error(getApiErrorMessage(e), "Could not save profile"),
  });

  const yearM = useMutation({
    mutationFn: () =>
      apiPost<{ yearId: string; termId: string }>("/onboarding/academic-baseline", {
        year: {
          name: yearForm.yearName,
          startDate: yearForm.yearStart,
          endDate: yearForm.yearEnd,
          isActive: true,
        },
        term: {
          termNumber: Number(yearForm.termNumber),
          startDate: yearForm.termStart,
          endDate: yearForm.termEnd,
          isActive: true,
        },
      }),
    onSuccess: (data) => {
      setYearId(data.yearId);
      toast.success("Academic calendar ready.");
      invalidate();
      setStep(4);
    },
    onError: (e) => toast.error(getApiErrorMessage(e), "Could not create year/term"),
  });

  const classesM = useMutation({
    mutationFn: () =>
      apiPost("/onboarding/classes", {
        academicYearId: yearId,
        classes: classRows.map((r) => ({ ...r, academicYearId: yearId })),
      }),
    onSuccess: () => {
      toast.success("Classes created.");
      invalidate();
      setStep(5);
    },
    onError: (e) => toast.error(getApiErrorMessage(e), "Could not create classes"),
  });

  const gradingM = useMutation({
    mutationFn: () => apiPost("/onboarding/grading-scales", {}),
    onSuccess: () => {
      toast.success("Grading scales installed.");
      invalidate();
      setStep(6);
    },
    onError: (e) => toast.error(getApiErrorMessage(e), "Could not seed grading scales"),
  });

  const staffM = useMutation({
    mutationFn: () =>
      apiPost<{ credentials: typeof staffCredentials }>("/onboarding/staff", {
        invites: staffRows.filter((r) => r.email.trim() && r.fullName.trim()),
      }),
    onSuccess: (data) => {
      setStaffCredentials(data.credentials ?? []);
      toast.success("Staff accounts created.");
      invalidate();
      setStep(7);
    },
    onError: (e) => toast.error(getApiErrorMessage(e), "Could not invite staff"),
  });

  const skipStaffM = useMutation({
    mutationFn: () => apiPost("/onboarding/skip", { step: "staff_invites" }),
    onSuccess: () => {
      invalidate();
      setStep(null);
    },
  });

  const skipGradingM = useMutation({
    mutationFn: () => apiPost("/onboarding/skip", { step: "grading_scales" }),
    onSuccess: () => {
      invalidate();
      setStep(null);
    },
  });

  const completeM = useMutation({
    mutationFn: () => apiPost("/onboarding/complete", {}),
    onSuccess: () => {
      toast.success("Welcome! Your school is ready.", "Setup complete");
      invalidate();
      router.replace("/admin/dashboard");
    },
    onError: (e) => toast.error(getApiErrorMessage(e), "Finish required steps first"),
  });

  const progress = statusQ.data?.progressPercent ?? 0;
  const checklist = statusQ.data?.checklist;

  const completionItems = useMemo(
    () =>
      [
        { label: "Change admin password", done: checklist?.passwordChanged, step: 1, optional: false },
        { label: "School branding & contact", done: checklist?.settingsConfigured, step: 2, optional: false },
        {
          label: "Academic year & term",
          done: checklist?.academicYearCreated && checklist?.termCreated,
          step: 3,
          optional: false,
        },
        { label: "Classes", done: checklist?.classesCreated, step: 4, optional: false },
        { label: "Grading scales", done: checklist?.gradingScalesSeeded, step: 5, optional: true },
        { label: "Staff invitations", done: checklist?.staffInvited, step: 6, optional: true },
      ] as const,
    [checklist],
  );

  const requiredComplete = completionItems
    .filter((item) => !item.optional)
    .every((item) => item.done);

  const goBack = () => setStep(Math.max(1, activeStep - 1));
  const goToStep = (target: number) => setStep(target);

  useEffect(() => {
    if (yearId || !checklist?.academicYearCreated) return;
    void apiGet<AcademicYear[]>("/academic/years").then((years) => {
      const active = years.find((y) => y.isActive) ?? years[0];
      if (active) setYearId(active.id);
    });
  }, [yearId, checklist?.academicYearCreated]);

  useEffect(() => {
    const s = settingsQ.data;
    if (!s) return;
    setProfileForm({
      schoolName: s.schoolName ?? "",
      motto: s.motto ?? "",
      contactEmail: s.contactEmail ?? "",
      contactPhone: s.contactPhone ?? "",
      physicalAddress: s.physicalAddress ?? "",
      primaryColor: s.primaryColor ?? "#1D4ED8",
      secondaryColor: s.secondaryColor ?? "#0F172A",
    });
  }, [settingsQ.data]);

  if (statusQ.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Preparing setup wizard…</p>
      </div>
    );
  }

  if (statusQ.data && !statusQ.data.required && statusQ.data.completedAt) {
    router.replace("/admin/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-8 lg:flex-row lg:py-12">
        <aside className="lg:w-72 lg:shrink-0">
          <p className="font-heading text-2xl font-semibold">School setup</p>
          <p className="mt-2 text-sm text-slate-400">
            Configure the essentials so your team can start using SchoolManage.
          </p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">{progress}% complete</p>
          <ol className="mt-8 space-y-3">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const done =
                s.id === 1
                  ? checklist?.passwordChanged
                  : s.id === 2
                    ? checklist?.settingsConfigured
                    : s.id === 3
                      ? checklist?.academicYearCreated && checklist?.termCreated
                      : s.id === 4
                        ? checklist?.classesCreated
                        : s.id === 5
                          ? checklist?.gradingScalesSeeded
                          : s.id === 6
                            ? checklist?.staffInvited
                            : Boolean(statusQ.data?.completedAt);
              const current = s.id === activeStep;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goToStep(s.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                      current ? "bg-white/10 ring-1 ring-white/20" : "text-slate-400"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0" />
                    )}
                    <span>{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <main className="flex flex-1 flex-col rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col"
            >
              {activeStep === 1 && (
                <>
                  <h2 className="font-heading text-xl font-semibold">Change your password</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Replace the temporary password from your platform administrator.
                  </p>
                  <div className="mt-6 max-w-md space-y-4">
                    <Input
                      label="Current password"
                      type="password"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
                    />
                    <Input
                      label="New password"
                      type="password"
                      value={passwordForm.next}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))}
                    />
                    <Input
                      label="Confirm new password"
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                    />
                  </div>
                  <div className="mt-auto flex justify-between pt-8">
                    <span />
                    <Button
                      disabled={passwordM.isPending}
                      onClick={() => passwordM.mutate()}
                    >
                      Save & continue
                    </Button>
                  </div>
                </>
              )}

              {activeStep === 2 && (
                <>
                  <h2 className="font-heading text-xl font-semibold">School profile</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    This appears on reports, invoices, and the staff portal.
                  </p>
                  <div className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
                    <Input
                      label="School name"
                      className="sm:col-span-2"
                      value={profileForm.schoolName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, schoolName: e.target.value }))}
                    />
                    <Input
                      label="Motto"
                      value={profileForm.motto}
                      onChange={(e) => setProfileForm((f) => ({ ...f, motto: e.target.value }))}
                    />
                    <Input
                      label="Contact email"
                      type="email"
                      value={profileForm.contactEmail}
                      onChange={(e) => setProfileForm((f) => ({ ...f, contactEmail: e.target.value }))}
                    />
                    <Input
                      label="Contact phone"
                      value={profileForm.contactPhone}
                      onChange={(e) => setProfileForm((f) => ({ ...f, contactPhone: e.target.value }))}
                    />
                    <Input
                      label="Physical address"
                      className="sm:col-span-2"
                      value={profileForm.physicalAddress}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, physicalAddress: e.target.value }))
                      }
                    />
                    <label className="text-sm">
                      Primary colour
                      <input
                        type="color"
                        className="mt-1 block h-10 w-full cursor-pointer rounded-lg border border-border bg-background"
                        value={profileForm.primaryColor}
                        onChange={(e) =>
                          setProfileForm((f) => ({ ...f, primaryColor: e.target.value }))
                        }
                      />
                    </label>
                    <label className="text-sm">
                      Secondary colour
                      <input
                        type="color"
                        className="mt-1 block h-10 w-full cursor-pointer rounded-lg border border-border bg-background"
                        value={profileForm.secondaryColor}
                        onChange={(e) =>
                          setProfileForm((f) => ({ ...f, secondaryColor: e.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <div className="mt-auto flex justify-between pt-8">
                    <Button variant="ghost" onClick={goBack}>
                      Back
                    </Button>
                    <Button disabled={profileM.isPending} onClick={() => profileM.mutate()}>
                      Save & continue
                    </Button>
                  </div>
                </>
              )}

              {activeStep === 3 && (
                <>
                  <h2 className="font-heading text-xl font-semibold">Academic year & term</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Set the active year and current term for attendance, fees, and assessments.
                  </p>
                  <div className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
                    <Input
                      label="Year name"
                      className="sm:col-span-2"
                      value={yearForm.yearName}
                      onChange={(e) => setYearForm((f) => ({ ...f, yearName: e.target.value }))}
                    />
                    <Input
                      label="Year starts"
                      type="date"
                      value={yearForm.yearStart}
                      onChange={(e) => setYearForm((f) => ({ ...f, yearStart: e.target.value }))}
                    />
                    <Input
                      label="Year ends"
                      type="date"
                      value={yearForm.yearEnd}
                      onChange={(e) => setYearForm((f) => ({ ...f, yearEnd: e.target.value }))}
                    />
                    <Select
                      label="Current term"
                      options={[
                        { value: "1", label: "Term 1" },
                        { value: "2", label: "Term 2" },
                        { value: "3", label: "Term 3" },
                      ]}
                      value={yearForm.termNumber}
                      onChange={(e) =>
                        setYearForm((f) => ({
                          ...f,
                          termNumber: e.target.value as "1" | "2" | "3",
                        }))
                      }
                    />
                    <Input
                      label="Term starts"
                      type="date"
                      value={yearForm.termStart}
                      onChange={(e) => setYearForm((f) => ({ ...f, termStart: e.target.value }))}
                    />
                    <Input
                      label="Term ends"
                      type="date"
                      value={yearForm.termEnd}
                      onChange={(e) => setYearForm((f) => ({ ...f, termEnd: e.target.value }))}
                    />
                  </div>
                  <div className="mt-auto flex justify-between pt-8">
                    <Button variant="ghost" onClick={goBack}>
                      Back
                    </Button>
                    <Button disabled={yearM.isPending} onClick={() => yearM.mutate()}>
                      Create & continue
                    </Button>
                  </div>
                </>
              )}

              {activeStep === 4 && (
                <>
                  <h2 className="font-heading text-xl font-semibold">Classes</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Add at least one class for the current academic year.
                  </p>
                  <div className="mt-6 space-y-3">
                    {classRows.map((row, idx) => (
                      <div key={idx} className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-3">
                        <Input
                          label="Class"
                          value={row.name}
                          onChange={(e) => {
                            const next = [...classRows];
                            next[idx] = { ...row, name: e.target.value };
                            setClassRows(next);
                          }}
                        />
                        <Input
                          label="Stream"
                          value={row.stream}
                          onChange={(e) => {
                            const next = [...classRows];
                            next[idx] = { ...row, stream: e.target.value };
                            setClassRows(next);
                          }}
                        />
                        <Select
                          label="Level"
                          options={[
                            { value: "O_LEVEL", label: "O-Level (S1–S4)" },
                            { value: "A_LEVEL", label: "A-Level (S5–S6)" },
                          ]}
                          value={row.level}
                          onChange={(e) => {
                            const next = [...classRows];
                            next[idx] = {
                              ...row,
                              level: e.target.value as "O_LEVEL" | "A_LEVEL",
                            };
                            setClassRows(next);
                          }}
                        />
                      </div>
                    ))}
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setClassRows((rows) => [
                          ...rows,
                          { name: `S${rows.length + 1}`, stream: "Main", level: "O_LEVEL" },
                        ])
                      }
                    >
                      Add another class
                    </Button>
                  </div>
                  <div className="mt-auto flex justify-between pt-8">
                    <Button variant="ghost" onClick={goBack}>
                      Back
                    </Button>
                    <Button
                      disabled={classesM.isPending || !yearId}
                      onClick={() => classesM.mutate()}
                    >
                      Save classes
                    </Button>
                  </div>
                </>
              )}

              {activeStep === 5 && (
                <>
                  <h2 className="font-heading text-xl font-semibold">Grading scales</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Install Uganda CBC (O-Level) and UNEB (A-Level) default grade boundaries.
                  </p>
                  <div className="mt-8 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-6">
                    <p className="text-sm text-indigo-100">
                      Recommended for new schools. You can adjust scales later under Academic →
                      Grading scales.
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-8">
                    <Button variant="ghost" onClick={goBack}>
                      Back
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="ghost" disabled={skipGradingM.isPending} onClick={() => skipGradingM.mutate()}>
                        Skip for now
                      </Button>
                      <Button disabled={gradingM.isPending} onClick={() => gradingM.mutate()}>
                        Install defaults
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {activeStep === 6 && (
                <>
                  <h2 className="font-heading text-xl font-semibold">Invite key staff</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Optional — create headteacher or bursar accounts with temporary passwords.
                  </p>
                  <div className="mt-6 space-y-3">
                    {staffRows.map((row, idx) => (
                      <div key={idx} className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-3">
                        <Input
                          label="Full name"
                          value={row.fullName}
                          onChange={(e) => {
                            const next = [...staffRows];
                            next[idx] = { ...row, fullName: e.target.value };
                            setStaffRows(next);
                          }}
                        />
                        <Input
                          label="Email"
                          type="email"
                          value={row.email}
                          onChange={(e) => {
                            const next = [...staffRows];
                            next[idx] = { ...row, email: e.target.value };
                            setStaffRows(next);
                          }}
                        />
                        <Select
                          label="Role"
                          options={[
                            { value: "headteacher", label: "Headteacher" },
                            { value: "bursar", label: "Bursar" },
                            { value: "class_teacher", label: "Class teacher" },
                            { value: "subject_teacher", label: "Subject teacher" },
                          ]}
                          value={row.role}
                          onChange={(e) => {
                            const next = [...staffRows];
                            next[idx] = {
                              ...row,
                              role: e.target.value as typeof row.role,
                            };
                            setStaffRows(next);
                          }}
                        />
                      </div>
                    ))}
                    {staffCredentials.length > 0 ? (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                        {staffCredentials.map((c) => (
                          <p key={c.email} className="mt-1 font-mono text-emerald-100">
                            {c.fullName}: {c.email} / {c.temporaryPassword}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-8">
                    <Button variant="ghost" onClick={goBack}>
                      Back
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="ghost" disabled={skipStaffM.isPending} onClick={() => skipStaffM.mutate()}>
                        Skip for now
                      </Button>
                      <Button disabled={staffM.isPending} onClick={() => staffM.mutate()}>
                        Create accounts
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {activeStep === 7 && (
                <>
                  <h2 className="font-heading text-xl font-semibold">You&apos;re all set</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Review your setup checklist. Required steps must be complete before you can open the
                    dashboard.
                  </p>
                  <ul className="mt-8 space-y-3 text-sm">
                    {completionItems.map((item) => (
                      <li key={item.label} className="flex items-center justify-between gap-3 text-slate-300">
                        <span className="flex items-center gap-2">
                          <CheckCircle2
                            className={`h-4 w-4 ${item.done ? "text-emerald-400" : "text-slate-600"}`}
                          />
                          {item.label}
                          {item.optional ? (
                            <span className="text-xs text-slate-500">(optional)</span>
                          ) : null}
                        </span>
                        {!item.done ? (
                          <Button variant="ghost" onClick={() => goToStep(item.step)}>
                            Complete
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {!requiredComplete ? (
                    <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      Finish the required steps above — especially school profile — then return here.
                    </p>
                  ) : null}
                  <div className="mt-auto flex justify-between pt-8">
                    <Button variant="ghost" onClick={goBack}>
                      Back
                    </Button>
                    <Button disabled={completeM.isPending || !requiredComplete} onClick={() => completeM.mutate()}>
                      Go to dashboard
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
