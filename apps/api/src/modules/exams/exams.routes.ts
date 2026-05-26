import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requireExamRoles } from "./exams.access";
import * as c from "./exams.controller";

export const examsRouter = Router();

examsRouter.use(requireAuth);

const admin = requireExamRoles("admin");
const leads = requireExamRoles("admin", "headteacher");
const teachers = requireExamRoles("subject_teacher", "class_teacher", "admin", "headteacher");

examsRouter.get("/marking-slots", teachers, asyncHandler(c.listMarkingSlots));
examsRouter.get("/open", teachers, asyncHandler(c.listOpenExams));
examsRouter.get("/", leads, asyncHandler(c.listExams));
examsRouter.post("/", admin, asyncHandler(c.createExam));
examsRouter.get("/:id", teachers, asyncHandler(c.getExam));
examsRouter.patch("/:id", admin, asyncHandler(c.updateExam));
examsRouter.delete("/:id", admin, asyncHandler(c.deleteExam));
examsRouter.post("/:id/open", admin, asyncHandler(c.openExam));
examsRouter.post("/:id/close", admin, asyncHandler(c.closeExam));
examsRouter.post("/:id/reopen", admin, asyncHandler(c.reopenExam));
examsRouter.get("/:id/subjects", teachers, asyncHandler(c.listExamSubjects));
examsRouter.get("/:id/marks", teachers, asyncHandler(c.getExamMarks));
examsRouter.post("/:id/marks/bulk", teachers, asyncHandler(c.saveExamMarks));
examsRouter.post("/:id/marks/submit", teachers, asyncHandler(c.submitExamMarks));
examsRouter.patch("/:id/marks/unlock", leads, asyncHandler(c.unlockExamMarks));
