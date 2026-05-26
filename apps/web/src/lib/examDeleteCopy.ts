import type { ExamSummary } from "@uganda-cbc-sms/shared";
import type { ExamDeletionImpact } from "@uganda-cbc-sms/shared";

export function examArchiveDialogCopy(exam: ExamSummary) {
  if (exam.status === "draft") {
    return {
      title: "Archive this draft exam?",
      description: `"${exam.name}" will be removed from active exam lists. No marks have been entered yet. You can restore it from the archive or permanently delete it later.`,
    };
  }
  if (exam.status === "open") {
    return {
      title: "Archive this open exam?",
      description: `"${exam.name}" will be hidden from teachers immediately. Saved marks remain in the system for records. Archive first before permanent deletion.`,
    };
  }
  return {
    title: "Archive this closed exam?",
    description: `"${exam.name}" will be removed from active lists. Marks and submissions stay stored. Report cards already generated keep their snapshot until regenerated.`,
  };
}

export function examArchiveSuccessMessage(exam: ExamSummary) {
  return `"${exam.name}" was archived. Find it under Archived exams when you need to restore or permanently delete it.`;
}

export function examPermanentDeleteDialogCopy(impact: ExamDeletionImpact) {
  if (!impact.canPermanentDelete && impact.linkedReportCount > 0) {
    return {
      title: "Cannot permanently delete",
      description: `${impact.linkedReportCount} report card snapshot(s) reference this exam. Archive the exam instead; historical PDFs keep their recorded source.`,
      confirmHint: impact.examName,
    };
  }
  const reportNote =
    impact.linkedReportCount > 0
      ? ` ${impact.linkedReportCount} generated report card(s) still reference this exam in their saved data. Regenerate those reports after deletion if needed.`
      : "";
  const marksNote =
    impact.marksCount > 0
      ? ` This will permanently remove ${impact.marksCount} mark record(s).`
      : "";

  return {
    title: "Permanently delete this exam?",
    description: `Type "${impact.examName}" below to confirm. This cannot be undone.${marksNote}${reportNote}`,
    confirmHint: impact.examName,
  };
}

export function examPermanentDeleteSuccessMessage(impact: ExamDeletionImpact) {
  return `"${impact.examName}" and all related exam data were permanently removed.${
    impact.linkedReportCount > 0
      ? ` ${impact.linkedReportCount} report card snapshot(s) still mention this exam until regenerated.`
      : ""
  }`;
}
