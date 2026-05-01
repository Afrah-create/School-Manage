import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import * as c from "./academic.controller";

export const academicRouter = Router();
const academicLeads = requireRoles("admin", "headteacher");
const academicReaders = requireRoles("admin", "headteacher", "class_teacher", "subject_teacher", "bursar");
const teachingReaders = requireRoles("admin", "headteacher", "class_teacher", "subject_teacher");

academicRouter.use(requireAuth);

academicRouter.post("/years", academicLeads, asyncHandler(c.postYear));
academicRouter.get("/years", academicReaders, asyncHandler(c.getYears));
academicRouter.post("/terms", academicLeads, asyncHandler(c.postTerm));
academicRouter.get("/terms", academicReaders, asyncHandler(c.getTerms));
academicRouter.post("/classes", academicLeads, asyncHandler(c.postClass));
academicRouter.get("/classes", academicReaders, asyncHandler(c.getClasses));
academicRouter.post("/subjects", academicLeads, asyncHandler(c.postSubject));
academicRouter.get("/subjects", teachingReaders, asyncHandler(c.getSubjects));
academicRouter.post("/class-subjects", academicLeads, asyncHandler(c.postClassSubject));
academicRouter.post("/combinations", academicLeads, asyncHandler(c.postCombination));
academicRouter.get("/combinations", teachingReaders, asyncHandler(c.getCombinations));
academicRouter.post("/cbc-strands", academicLeads, asyncHandler(c.postCbcStrand));
academicRouter.get("/cbc-strands", teachingReaders, asyncHandler(c.getCbcStrands));
