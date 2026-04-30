"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { FeeBalanceCard } from "@/components/fees/FeeBalanceCard";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";

type StudentView = {
  id: string;
  studentNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  guardianName: string;
  guardianContact: string;
  photoUrl: string | null;
  status: string;
};

export default function AdminStudentProfilePage() {
  const params = useParams();
  const id = String(params["id"]);
  const [st, setSt] = useState<StudentView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const row = await apiGet<StudentView>(`/students/${encodeURIComponent(id)}`);
        setSt(row);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <PageWrapper title="Student profile" description="Details & fees">
      {loading ? <p className="text-slate-600">Loading…</p> : null}
      {err ? <p className="text-red-600">{err}</p> : null}
      {st ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Bio">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Student #</dt>
                <dd className="font-medium">{st.studentNumber}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd className="font-medium">{st.fullName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">DOB / Gender</dt>
                <dd>
                  {st.dateOfBirth} — {st.gender}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Guardian</dt>
                <dd>
                  {st.guardianName} ({st.guardianContact})
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd>{st.status}</dd>
              </div>
            </dl>
          </Card>
          <FeeBalanceCard studentId={st.id} />
        </div>
      ) : null}
    </PageWrapper>
  );
}
