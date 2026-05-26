import type { ExamSummary } from "@uganda-cbc-sms/shared";

export function examDeleteDialogCopy(exam: ExamSummary) {
  if (exam.status === "draft") {
    return {
      title: "Delete this draft exam?",
      description: `"${exam.name}" will be removed from the exams list. Saved marks are not affected because none exist yet.`,
    };
  }
  if (exam.status === "open") {
    return {
      title: "Delete this open exam?",
      description: `"${exam.name}" will be hidden from teachers and admin lists. Entered marks stay in the database but the exam will no longer appear for marking.`,
    };
  }
  return {
    title: "Delete this closed exam?",
    description: `"${exam.name}" will be removed from lists. Marks and submissions remain stored for records but the exam will not be shown in the system.`,
  };
}

export function examDeleteSuccessMessage(exam: ExamSummary) {
  return `"${exam.name}" was deleted and removed from exam lists.`;
}
