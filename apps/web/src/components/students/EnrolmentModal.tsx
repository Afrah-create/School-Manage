"use client";

import { EnrolmentForm } from "@/components/students/EnrolmentForm";
import { Modal } from "@/components/ui/Modal";

export function EnrolmentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (studentId: string) => void;
}) {
  if (!open) return null;

  return (
    <Modal open={open} title="Enrol new student" size="wide" onClose={onClose}>
      <p className="mb-4 text-sm text-muted-foreground">
        Create a learner record, assign a class, and optionally add a profile photo. A student number is
        generated automatically.
      </p>
      <EnrolmentForm
        embedded
        onCancel={onClose}
        onCreated={(id) => {
          onCreated(id);
          onClose();
        }}
      />
    </Modal>
  );
}
