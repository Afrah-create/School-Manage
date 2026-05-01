export type RoleKey = "admin" | "headteacher" | "class-teacher" | "subject-teacher" | "bursar";

/** Serializable nav icon id — resolved to Lucide components inside client ShellSidebar only */
export type NavIconId =
  | "home"
  | "users"
  | "bookOpen"
  | "clipboardCheck"
  | "fileBarChart2"
  | "creditCard"
  | "graduationCap"
  | "barChart3"
  | "school"
  | "receipt";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconId;
  activePrefix?: string;
  exactMatch?: boolean;
};

export type RoleShellConfig = {
  role: RoleKey;
  roleLabel: string;
  productLabel: string;
  items: NavItem[];
};

export type DashboardMetric = {
  label: string;
  value: string;
  helper?: string;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
};
