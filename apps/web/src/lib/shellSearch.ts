import { flattenNavItems } from "@/components/layout/shells/navFlatten";
import type { NavIconId, NavItem, RoleKey, RoleShellConfig } from "@/components/layout/shells/types";

export type ShellSearchEntry = {
  id: string;
  type: "page" | "action" | "student";
  href: string;
  label: string;
  description?: string;
  icon?: NavIconId;
  keywords?: string;
};

type QuickActionDef = {
  href: string;
  label: string;
  description: string;
  icon: NavIconId;
  keywords?: string;
};

const ROLE_QUICK_ACTIONS: Partial<Record<RoleKey, QuickActionDef[]>> = {
  admin: [
    {
      href: "/admin/students/enrol",
      label: "Enrol student",
      description: "Admit a new learner",
      icon: "users",
      keywords: "admit register new",
    },
    {
      href: "/admin/users/create",
      label: "Create user",
      description: "Staff account",
      icon: "graduationCap",
      keywords: "staff teacher account",
    },
    {
      href: "/admin/fees/publish",
      label: "Publish fees",
      description: "Release fee schedules",
      icon: "creditCard",
    },
  ],
  headteacher: [
    {
      href: "/headteacher/analytics",
      label: "Analytics",
      description: "School performance overview",
      icon: "barChart3",
    },
    {
      href: "/headteacher/fees",
      label: "School finance",
      description: "Collections and payments",
      icon: "creditCard",
    },
  ],
  bursar: [
    {
      href: "/bursar/fees/payments",
      label: "Record payment",
      description: "Cash or mobile money",
      icon: "creditCard",
    },
    {
      href: "/bursar/fees/invoices?tab=active",
      label: "Active bills",
      description: "Unpaid invoices",
      icon: "receipt",
    },
    {
      href: "/bursar/fees/reports",
      label: "Term reports",
      description: "Financial reports",
      icon: "fileBarChart2",
    },
  ],
  "class-teacher": [
    {
      href: "/class-teacher/attendance",
      label: "Take attendance",
      description: "Daily class register",
      icon: "clipboardCheck",
    },
  ],
  "subject-teacher": [
    {
      href: "/subject-teacher/assessment/cbc",
      label: "CBC assessment",
      description: "Competency ratings",
      icon: "clipboardCheck",
    },
  ],
};

/** Extra finance routes for bursar (not all in sidebar). */
const BURSAR_EXTRA_PAGES: QuickActionDef[] = [
  {
    href: "/bursar/fees/payments/history",
    label: "Payment history",
    description: "All receipts",
    icon: "receipt",
  },
  {
    href: "/bursar/fees/schedules",
    label: "Fee schedules",
    description: "Published rates",
    icon: "creditCard",
  },
];

function navToEntry(item: NavItem): ShellSearchEntry {
  return {
    id: `page:${item.href}`,
    type: "page",
    href: item.href,
    label: item.label,
    description: "Go to page",
    icon: item.icon,
    keywords: item.href,
  };
}

export function buildShellSearchIndex(config: RoleShellConfig): ShellSearchEntry[] {
  const pages = flattenNavItems(config.items).map(navToEntry);
  const actions = (ROLE_QUICK_ACTIONS[config.role] ?? []).map((a) => ({
    id: `action:${a.href}`,
    type: "action" as const,
    href: a.href,
    label: a.label,
    description: a.description,
    icon: a.icon,
    keywords: a.keywords,
  }));
  const extra =
    config.role === "bursar"
      ? BURSAR_EXTRA_PAGES.map((a) => ({
          id: `page:${a.href}`,
          type: "page" as const,
          href: a.href,
          label: a.label,
          description: a.description,
          icon: a.icon,
          keywords: a.keywords,
        }))
      : [];

  const seen = new Set<string>();
  return [...pages, ...extra, ...actions].filter((e) => {
    if (seen.has(e.href)) return false;
    seen.add(e.href);
    return true;
  });
}

export function filterShellSearchEntries(entries: ShellSearchEntry[], query: string): ShellSearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) => {
    const hay = [e.label, e.description, e.keywords, e.href].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function studentDetailPath(role: RoleKey, studentId: string): string {
  return `/${role}/students/${studentId}`;
}

export type StudentSearchHit = {
  id: string;
  fullName: string;
  studentNumber: string;
  className?: string | null;
};

export function studentToSearchEntry(role: RoleKey, student: StudentSearchHit): ShellSearchEntry {
  const classLabel = student.className ? ` · ${student.className}` : "";
  return {
    id: `student:${student.id}`,
    type: "student",
    href: studentDetailPath(role, student.id),
    label: student.fullName,
    description: `${student.studentNumber}${classLabel}`,
    icon: "users",
    keywords: `${student.studentNumber} ${student.fullName}`,
  };
}
