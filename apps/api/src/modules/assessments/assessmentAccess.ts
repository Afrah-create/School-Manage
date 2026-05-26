import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../utils/httpError";
import * as svc from "./assessments.service";

export function requireAssessmentRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }
    next();
  };
}

export async function assertTeacherOwnsStudentSubject(
  teacherId: string,
  studentId: string,
  subjectId: string,
  yearId: string,
) {
  const ok = await svc.teacherAssignedToStudentSubject(teacherId, studentId, subjectId, yearId);
  if (!ok) {
    throw new HttpError(
      403,
      "You can only enter marks for students in classes where you are the assigned subject teacher.",
    );
  }
}

export async function assertTeacherOwnsClassSubject(
  teacherId: string,
  classId: string,
  subjectId: string,
  yearId: string,
) {
  const ok = await svc.teacherAssignedToClassSubject(teacherId, classId, subjectId, yearId);
  if (!ok) {
    throw new HttpError(
      403,
      "You can only submit marks for subjects assigned to you on the class timetable.",
    );
  }
}
