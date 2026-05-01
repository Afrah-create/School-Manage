import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  FileBarChart2,
  GraduationCap,
  Home,
  Receipt,
  School,
  Users,
} from "lucide-react";
import type { NavIconId } from "./types";

export const NAV_ICON_MAP: Record<NavIconId, LucideIcon> = {
  home: Home,
  users: Users,
  bookOpen: BookOpen,
  clipboardCheck: ClipboardCheck,
  fileBarChart2: FileBarChart2,
  creditCard: CreditCard,
  graduationCap: GraduationCap,
  barChart3: BarChart3,
  school: School,
  receipt: Receipt,
};
