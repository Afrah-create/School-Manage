import type { Role } from "../constants/roles";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface UserPublic {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  photoUrl?: string | null;
  createdAt?: string;
}

export interface Student {
  id: string;
  studentNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: "male" | "female";
  guardianName: string;
  guardianContact: string;
  guardianEmail: string | null;
  address: string | null;
  previousSchool: string | null;
  classId: string | null;
  combinationId: string | null;
  photoUrl: string | null;
  status: "active" | "transferred" | "withdrawn";
  transferReason: string | null;
  enrolledAt: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Term {
  id: string;
  academicYearId: string;
  termNumber: 1 | 2 | 3;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface SchoolClass {
  id: string;
  name: string;
  stream: string;
  level: "O_LEVEL" | "A_LEVEL";
  academicYearId: string;
  classTeacherId: string | null;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  level: "O_LEVEL" | "A_LEVEL";
}

export interface CbcScoreRow {
  id: string;
  studentId: string;
  subjectId: string;
  strandId: string;
  termId: string;
  competency: string;
  rating: "A" | "B" | "C" | "D";
  submitted: boolean;
  submittedAt: string | null;
  teacherId: string | null;
}

export interface AlevelScoreRow {
  id: string;
  studentId: string;
  subjectId: string;
  termId: string;
  score: string;
  grade: string | null;
  points: number | null;
}

export interface FeeInvoiceRow {
  id: string;
  studentId: string;
  termId: string;
  totalAmount: string;
  amountPaid: string;
  balance: string;
  isFlagged: boolean;
}

export type { Role };
