"use client";

import Link from "next/link";
import { Unlock } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";

export default function HeadteacherAssessmentHubPage() {
  return (
    <PageWrapper
      title="Assessment oversight"
      description="Use the Assessment menu in the sidebar for CBC, A-Level, and formal exam workflows."
    >
      <p className="-mt-2 mb-6 text-sm text-muted-foreground">
        Teachers enter marks on their portals. Use this hub to see submission progress, unlock locked CBC sheets, and
        manage the exam lifecycle.
      </p>

      <Card title="Quick actions">
        <ul className="space-y-2 text-sm">
          <li>
            <Link
              href="/headteacher/assessment/cbc"
              className="inline-flex items-center gap-2 font-medium text-brand hover:underline"
            >
              <Unlock className="h-4 w-4" />
              Unlock CBC submissions
            </Link>
          </li>
          <li>
            <Link href="/headteacher/reports" className="font-medium text-brand hover:underline">
              Review and approve report cards →
            </Link>
          </li>
          <li>
            <Link href="/headteacher/analytics" className="font-medium text-brand hover:underline">
              School-wide analytics →
            </Link>
          </li>
        </ul>
      </Card>
    </PageWrapper>
  );
}
