import type { Role } from "@uganda-cbc-sms/shared";
import type { AuthUser } from "@/store/authStore";

const ROLE_DASHBOARD: Record<Role, string> = {
  admin: "/admin/dashboard",
  headteacher: "/headteacher/dashboard",
  class_teacher: "/class-teacher/dashboard",
  subject_teacher: "/subject-teacher/dashboard",
  bursar: "/bursar/dashboard",
};

export function dashboardForRole(role: Role): string {
  return ROLE_DASHBOARD[role] ?? "/login";
}

/** Where to send the user immediately after a successful school login. */
export function postLoginPath(user: Pick<AuthUser, "role" | "forcePasswordChange">): string {
  if (user.forcePasswordChange) {
    return user.role === "admin" ? "/admin/onboarding" : "/auth/change-password";
  }
  return dashboardForRole(user.role);
}
