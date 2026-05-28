import type { Role } from "../constants/roles";
import type { ExamStatus } from "../schemas/exam.schema";

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

export type { ExamStatus };

export interface ExamSummary {
  id: string;
  name: string;
  academicYearId: string;
  termId: string;
  classId: string;
  className?: string;
  classStream?: string | null;
  classLevel?: string;
  examDate: string | null;
  maxScore: number;
  status: ExamStatus;
  subjectCount?: number;
  createdAt?: string;
  openedAt?: string | null;
  closedAt?: string | null;
  isArchived?: boolean;
}

export interface ExamSubject {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  isCompulsory: boolean;
  isSubmitted?: boolean;
  /** Students registered to sit this paper on the exam. */
  entrantsCount?: number;
}

export interface ExamMarkingProgress {
  totalSubjects: number;
  submittedSubjects: number;
  pendingSubjects: number;
  activeStudents: number;
  marksEntered: number;
  /** Sum of student×paper registrations across the exam. */
  totalEntries?: number;
}

export interface ExamEntriesMatrix {
  students: Array<{
    id: string;
    fullName: string;
    studentNumber: string;
  }>;
  papers: Array<{
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    isCompulsory: boolean;
    entrantsCount: number;
  }>;
  /** studentId → subjectIds the learner is entered for */
  entriesByStudent: Record<string, string[]>;
}

export interface ExamDeletionImpact {
  examName: string;
  status: ExamStatus;
  isArchived: boolean;
  marksCount: number;
  linkedReportCount: number;
  canPermanentDelete: boolean;
  blockReason?: string | null;
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
  /** Present on list endpoints that join classes */
  className?: string | null;
  classStream?: string | null;
  combinationId: string | null;
  photoUrl: string | null;
  status: "active" | "transferred" | "withdrawn";
  transferReason: string | null;
  enrolledAt: string;
}

export interface PaginatedStudents {
  items: Student[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ClassEnrollmentSummary {
  classId: string;
  className: string;
  classStream: string | null;
  activeCount: number;
  totalCount: number;
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
export type {
  FeeInvoice,
  FeePayment,
  FeePaymentResult,
  FeeBalance,
  FeeStructure,
  FeeStructureCopyResult,
  FeeTermReport,
  BulkInvoiceResult,
} from "./fees";
