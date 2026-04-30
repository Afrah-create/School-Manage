"use client";

import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { EnrolmentForm } from "@/components/students/EnrolmentForm";

export default function AdminEnrolPage() {
  const router = useRouter();
  return (
    <PageWrapper title="Enrol student" description="Create a new student record">
      <EnrolmentForm
        onCreated={(id) => {
          router.push(`/admin/students/${id}`);
        }}
      />
    </PageWrapper>
  );
}
