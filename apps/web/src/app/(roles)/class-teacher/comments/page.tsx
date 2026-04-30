"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";

export default function ClassTeacherCommentsPage() {
  return (
    <PageWrapper title="Report card comments" description="Class teacher narrative comments">
      <Card title="Requires backend extension">
        <p className="text-sm text-slate-600">
          Listing reports missing a class-teacher comment needs a dedicated endpoint (e.g.{" "}
          <code className="rounded bg-slate-100 px-1">GET /api/reports?missingTeacherComment=true</code>). Until then,
          add comments when finalising report cards in the admin / headteacher workflow.
        </p>
      </Card>
    </PageWrapper>
  );
}
