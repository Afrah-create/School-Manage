import type { RoleKey, RoleShellConfig } from "./types";

const PRODUCT_LABEL = "Uganda CBC SMS";

export const SHELL_NAV_CONFIG: Record<RoleKey, RoleShellConfig> = {
  admin: {
    role: "admin",
    roleLabel: "Admin",
    productLabel: PRODUCT_LABEL,
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: "home" },
      { href: "/admin/students", label: "Students", icon: "users", activePrefix: "/admin/students" },
      { href: "/admin/academic", label: "Academic", icon: "bookOpen", activePrefix: "/admin/academic" },
      {
        href: "/admin/assessment",
        label: "Assessment overview",
        icon: "clipboardCheck",
        activePrefix: "/admin/assessment",
      },
      { href: "/admin/exams", label: "Exams", icon: "fileText", activePrefix: "/admin/exams" },
      { href: "/admin/reports", label: "Reports", icon: "fileBarChart2", activePrefix: "/admin/reports" },
      {
        href: "/admin/attendance",
        label: "Attendance",
        icon: "barChart3",
        activePrefix: "/admin/attendance",
      },
      { href: "/admin/fees/overview", label: "Fees", icon: "creditCard", activePrefix: "/admin/fees" },
      { href: "/admin/users", label: "Users", icon: "graduationCap", activePrefix: "/admin/users" },
    ],
  },
  headteacher: {
    role: "headteacher",
    roleLabel: "Headteacher",
    productLabel: PRODUCT_LABEL,
    items: [
      { href: "/headteacher/dashboard", label: "Dashboard", icon: "home" },
      {
        href: "/headteacher/students",
        label: "Students",
        icon: "users",
        activePrefix: "/headteacher/students",
      },
      {
        href: "/headteacher/academic",
        label: "Academic",
        icon: "bookOpen",
        activePrefix: "/headteacher/academic",
      },
      {
        href: "/headteacher/assessment/cbc",
        label: "Assessments",
        icon: "clipboardCheck",
        activePrefix: "/headteacher/assessment",
      },
      {
        href: "/headteacher/reports",
        label: "Report Cards",
        icon: "fileBarChart2",
        activePrefix: "/headteacher/reports",
      },
      {
        href: "/headteacher/analytics",
        label: "Analytics",
        icon: "barChart3",
        activePrefix: "/headteacher/analytics",
      },
      {
        href: "/headteacher/attendance",
        label: "Attendance",
        icon: "clipboardCheck",
        activePrefix: "/headteacher/attendance",
      },
    ],
  },
  "class-teacher": {
    role: "class-teacher",
    roleLabel: "Class teacher",
    productLabel: PRODUCT_LABEL,
    items: [
      { href: "/class-teacher/dashboard", label: "Dashboard", icon: "home" },
      {
        href: "/class-teacher/students",
        label: "My classes",
        icon: "school",
        activePrefix: "/class-teacher/students",
      },
      {
        href: "/class-teacher/attendance",
        label: "Attendance",
        icon: "clipboardCheck",
        activePrefix: "/class-teacher/attendance",
      },
      {
        href: "/class-teacher/assessment/cbc",
        label: "CBC Assessment",
        icon: "bookOpen",
        activePrefix: "/class-teacher/assessment/cbc",
      },
      {
        href: "/class-teacher/assessment/alevel",
        label: "A-Level Assessment",
        icon: "graduationCap",
        activePrefix: "/class-teacher/assessment/alevel",
      },
      { href: "/class-teacher/exams", label: "Exams", icon: "fileText", activePrefix: "/class-teacher/exams" },
      {
        href: "/class-teacher/comments",
        label: "Report comments",
        icon: "fileBarChart2",
        activePrefix: "/class-teacher/comments",
      },
    ],
  },
  "subject-teacher": {
    role: "subject-teacher",
    roleLabel: "Subject teacher",
    productLabel: PRODUCT_LABEL,
    items: [
      { href: "/subject-teacher/dashboard", label: "Dashboard", icon: "home" },
      {
        href: "/subject-teacher/students",
        label: "My classes",
        icon: "users",
        activePrefix: "/subject-teacher/students",
      },
      {
        href: "/subject-teacher/attendance",
        label: "Attendance",
        icon: "clipboardCheck",
        activePrefix: "/subject-teacher/attendance",
      },
      {
        href: "/subject-teacher/assessment/cbc",
        label: "CBC Assessment",
        icon: "clipboardCheck",
        activePrefix: "/subject-teacher/assessment/cbc",
      },
      {
        href: "/subject-teacher/assessment/alevel",
        label: "A-Level Assessment",
        icon: "bookOpen",
        activePrefix: "/subject-teacher/assessment/alevel",
      },
      { href: "/subject-teacher/exams", label: "Exams", icon: "fileText", activePrefix: "/subject-teacher/exams" },
    ],
  },
  bursar: {
    role: "bursar",
    roleLabel: "Bursar",
    productLabel: PRODUCT_LABEL,
    items: [
      { href: "/bursar/dashboard", label: "Dashboard", icon: "home" },
      { href: "/bursar/fees", label: "Fee Overview", icon: "creditCard", exactMatch: true },
      {
        href: "/bursar/fees/invoices",
        label: "Invoices",
        icon: "receipt",
        activePrefix: "/bursar/fees/invoices",
      },
      {
        href: "/bursar/fees/payments",
        label: "Record Payment",
        icon: "creditCard",
        activePrefix: "/bursar/fees/payments",
      },
      {
        href: "/bursar/fees/reports",
        label: "Financial Reports",
        icon: "fileBarChart2",
        activePrefix: "/bursar/fees/reports",
      },
    ],
  },
};
