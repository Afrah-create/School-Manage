"use client";

import type { UserPublic } from "@uganda-cbc-sms/shared";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { UserProfileForm } from "@/components/profile/UserProfileForm";
import { useAuthStore } from "@/store/authStore";
import { apiGet } from "@/lib/api";
import { queryStatus } from "@/lib/queryStatus";

type ProfileUser = UserPublic & { photoUrl?: string | null };

export default function ProfilePage() {
  const authUser = useAuthStore((s) => s.user);
  const rolePrefixes: Record<string, string> = {
    admin: "/admin",
    headteacher: "/headteacher",
    class_teacher: "/class-teacher",
    subject_teacher: "/subject-teacher",
    bursar: "/bursar",
  };
  const rolePrefix = authUser ? (rolePrefixes[authUser.role] ?? "/login") : "/login";

  const profileQ = useQuery({
    queryKey: ["profile-me"],
    queryFn: () => apiGet<ProfileUser>("/users/me"),
  });

  const status = queryStatus(profileQ);

  return (
    <PageWrapper title="My profile" description="Update your name, email, and profile photo">
      <div className="mb-4">
        <Link href={`${rolePrefix}/dashboard`} className="text-sm font-medium text-brand hover:underline">
          ← Back to dashboard
        </Link>
      </div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:gap-4">
        <Link href="/profile/notifications" className="text-sm font-medium text-brand hover:underline">
          Notifications →
        </Link>
        <Link href="/profile/notifications/settings" className="text-sm font-medium text-brand hover:underline">
          Notification settings →
        </Link>
      </div>
      <AsyncContent
        status={status}
        loading={<FormSkeleton fields={4} />}
        error={
          <ErrorState
            message={profileQ.error instanceof Error ? profileQ.error.message : "Failed to load profile"}
            onRetry={() => void profileQ.refetch()}
          />
        }
      >
        {profileQ.data ? <UserProfileForm initial={profileQ.data} /> : null}
      </AsyncContent>
    </PageWrapper>
  );
}
