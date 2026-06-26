export type RoleShowcaseItem = {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  points: string[];
};

export const roleShowcaseItems: RoleShowcaseItem[] = [
  {
    id: "headteacher",
    title: "Headteacher",
    description:
      "See school-wide attendance, fee collection, and class performance at a glance. Review submitted assessments and approve report cards before they go to parents.",
    image: "/images/Headteacher.png",
    imageAlt: "Headteachers reviewing the school dashboard on desktop",
    points: [
      "Dashboard with enrolment, attendance, and fee KPIs",
      "Approve CBC and A-Level report cards",
      "Unlock submitted assessments when corrections are needed",
    ],
  },
  {
    id: "class-teacher",
    title: "Class teacher",
    description:
      "Work with your class list every day. Mark attendance, browse learners, and keep student records current without digging through paper registers.",
    image: "/images/ClassTeacher.png",
    imageAlt: "Class teacher recording attendance on a laptop in the classroom",
    points: [
      "Daily attendance for your assigned class",
      "Student browse and profile access",
      "Class-focused dashboard and shortcuts",
    ],
  },
  {
    id: "subject-teacher",
    title: "Subject teacher",
    description:
      "Enter O-Level CBC ratings and project work, or A-Level exam marks, from a focused assessment screen built for the subjects you teach.",
    image: "/images/SubjectTeacher.png",
    imageAlt: "Subject teacher entering assessment scores on a computer",
    points: [
      "CBC strand and competency entry (O-Level)",
      "A-Level numerical score entry with UNEB conversion",
      "Submit assessments for headteacher review",
    ],
  },
  {
    id: "bursar",
    title: "Bursar",
    description:
      "Run school finances in Ugandan shillings. Issue invoices, record cash or mobile money payments, and pull up a learner's balance when a parent visits the office.",
    image: "/images/Bursar.png",
    imageAlt: "Bursar recording a cash fee payment in the school office",
    points: [
      "Fee schedules, invoices, and payment recording",
      "Cash and mobile money with transaction references",
      "Per-student balances and collection reports",
    ],
  },
  {
    id: "onboarding",
    title: "School setup",
    description:
      "School admins configure academic years, classes, subjects, and grading scales once. New staff accounts are added with the right role so everyone lands on the correct dashboard.",
    image: "/images/StaffOnboarding.png",
    imageAlt: "School admin setting up school structure and staff accounts",
    points: [
      "Guided setup for years, terms, and classes",
      "CBC strands and UNEB grading scale defaults",
      "Role-based accounts for school admin, teachers, and bursar",
    ],
  },
  {
    id: "mobile",
    title: "Works on mobile too",
    description:
      "Staff can check the dashboard and key figures from a phone between lessons or at the school gate. No separate app install required.",
    image: "/images/MobileResponsive.png",
    imageAlt: "Teacher viewing the school dashboard on a smartphone on campus",
    points: [
      "Responsive layout for phones and tablets",
      "Lightweight pages for typical school-day use",
      "Sign in from any modern mobile browser",
    ],
  },
];
