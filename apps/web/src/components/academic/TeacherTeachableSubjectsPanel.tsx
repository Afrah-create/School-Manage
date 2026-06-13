"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Subject } from "@uganda-cbc-sms/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { filterSubjectsByLevel, levelShortLabel, type AcademicLevel } from "@/lib/academicLevel";
import { apiGet, apiPut } from "@/lib/api";

const CHECK =
  "h-4 w-4 rounded border-border text-foreground accent-brand disabled:cursor-not-allowed disabled:opacity-50";

type TeacherSpecialization = {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  level: string;
};

export function TeacherTeachableSubjectsPanel({
  teacherId,
  teacherName,
  highlightLevel,
  onSaved,
}: {
  teacherId: string;
  teacherName?: string;
  highlightLevel?: AcademicLevel;
  onSaved?: () => void | Promise<void>;
}) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const loadSeq = useRef(0);
  const saveSeq = useRef(0);

  useEffect(() => {
    if (!teacherId) return;
    const seq = ++loadSeq.current;
    setLoading(true);
    setErr(null);
    setOk(null);
    void (async () => {
      try {
        const [catalog, specs] = await Promise.all([
          apiGet<Subject[]>("/academic/subjects"),
          apiGet<TeacherSpecialization[]>(
            `/academic/teachers/${encodeURIComponent(teacherId)}/specializations`,
          ),
        ]);
        if (seq !== loadSeq.current) return;
        setSubjects(catalog);
        setSelectedIds(specs.map((s) => s.subjectId));
      } catch (e) {
        if (seq !== loadSeq.current) return;
        setErr(e instanceof Error ? e.message : "Failed to load teachable subjects");
      } finally {
        if (seq === loadSeq.current) setLoading(false);
      }
    })();
  }, [teacherId]);

  const oLevelSubjects = useMemo(() => filterSubjectsByLevel(subjects, "O_LEVEL"), [subjects]);
  const aLevelSubjects = useMemo(() => filterSubjectsByLevel(subjects, "A_LEVEL"), [subjects]);
  const oSelected = useMemo(
    () => selectedIds.filter((id) => oLevelSubjects.some((s) => s.id === id)).length,
    [selectedIds, oLevelSubjects],
  );
  const aSelected = useMemo(
    () => selectedIds.filter((id) => aLevelSubjects.some((s) => s.id === id)).length,
    [selectedIds, aLevelSubjects],
  );

  const onSave = async () => {
    if (!teacherId || saving || loading) return;
    const seq = ++saveSeq.current;
    setErr(null);
    setOk(null);
    setSaving(true);
    try {
      const saved = await apiPut<TeacherSpecialization[]>(
        `/academic/teachers/${encodeURIComponent(teacherId)}/specializations`,
        { subjectIds: selectedIds },
      );
      if (seq !== saveSeq.current) return;
      setSelectedIds(saved.map((s) => s.subjectId));
      setOk("Teachable subjects saved.");
      await onSaved?.();
    } catch (e) {
      if (seq !== saveSeq.current) return;
      setErr(e instanceof Error ? e.message : "Failed to save teachable subjects");
    } finally {
      if (seq === saveSeq.current) setSaving(false);
    }
  };

  const renderLevelGroup = (level: AcademicLevel, levelSubjects: Subject[]) => {
    if (levelSubjects.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No {levelShortLabel(level)} subjects in the catalogue.{" "}
          <Link href={`/admin/academic/subjects?level=${level}`} className="font-medium text-brand hover:underline">
            Add subjects
          </Link>
          .
        </p>
      );
    }

    return (
      <div
        className={`rounded-md border p-3 ${
          highlightLevel === level ? "border-brand/40 bg-brand/5" : "border-border"
        }`}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {levelShortLabel(level)} ({levelSubjects.filter((s) => selectedIds.includes(s.id)).length} selected)
        </p>
        <div className="max-h-40 space-y-1 overflow-auto">
          {levelSubjects.map((s) => (
            <label key={s.id} className="flex items-center gap-2 py-0.5 text-sm">
              <input
                type="checkbox"
                className={CHECK}
                checked={selectedIds.includes(s.id)}
                disabled={loading || saving}
                onChange={(e) =>
                  setSelectedIds((prev) =>
                    e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                  )
                }
              />
              {s.code} — {s.name}
            </label>
          ))}
        </div>
      </div>
    );
  };

  if (!teacherId) {
    return <p className="text-sm text-muted-foreground">Select a teacher to manage teachable subjects.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {teacherName ? (
          <>
            Set which subjects <span className="font-medium text-foreground">{teacherName}</span> is qualified to
            teach. Leave a level empty to allow any subject at that level until restrictions are set.
          </>
        ) : (
          <>
            Set which subjects this teacher is qualified to teach. Class teachers can always teach any subject in
            their homeroom class.
          </>
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        O-Level: {oSelected} selected · A-Level: {aSelected} selected
      </p>
      {err ? <Alert tone="error">{err}</Alert> : null}
      {ok ? <Alert tone="success">{ok}</Alert> : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading teachable subjects…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {renderLevelGroup("O_LEVEL", oLevelSubjects)}
          {renderLevelGroup("A_LEVEL", aLevelSubjects)}
        </div>
      )}
      <div className="flex justify-end">
        <Button type="button" loading={saving} disabled={loading || saving} onClick={() => void onSave()}>
          Save teachable subjects
        </Button>
      </div>
    </div>
  );
}
