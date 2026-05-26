"use client";

import type { Student } from "@uganda-cbc-sms/shared";
import { useEffect, useState } from "react";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { StudentEditForm } from "@/components/students/StudentEditForm";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { apiGet } from "@/lib/api";

export function StudentEditModal({
  open,
  studentId,
  onClose,
  onSaved,
}: {
  open: boolean;
  studentId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !studentId) {
      setStudent(null);
      setErr(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const row = await apiGet<Student>(`/students/${encodeURIComponent(studentId)}`);
        if (!cancelled) setStudent(row);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Failed to load student");
          setStudent(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, studentId]);

  if (!open) return null;

  const title = student ? `Edit ${student.fullName}` : "Edit student";

  return (
    <Modal open={open} title={title} size="wide" onClose={onClose}>
      {loading ? <FormSkeleton fields={8} /> : null}
      {err ? <Alert tone="error">{err}</Alert> : null}
      {student && studentId ? (
        <>
          <div className="mb-4 flex items-center gap-3">
            <StudentAvatar fullName={student.fullName} photoUrl={student.photoUrl} size="lg" />
            <div>
              <p className="text-sm text-muted-foreground">
                Student no: <span className="font-mono">{student.studentNumber}</span>
              </p>
              {student.className ? (
                <p className="text-sm text-muted-foreground">
                  {student.className}
                  {student.classStream ? ` · ${student.classStream}` : ""}
                </p>
              ) : null}
            </div>
          </div>
          <StudentEditForm
            key={student.id}
            studentId={studentId}
            initial={student}
            embedded
            onCancel={onClose}
            onSaved={() => {
              onSaved?.();
              onClose();
            }}
          />
        </>
      ) : null}
    </Modal>
  );
}
