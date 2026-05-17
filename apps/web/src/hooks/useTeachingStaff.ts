"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export type TeachingStaffMember = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  specializationCount: number;
};

function staffLabel(t: TeachingStaffMember): string {
  const spec =
    t.specializationCount > 0 ? ` · ${t.specializationCount} subject(s)` : " · any subject (not specialized)";
  return `${t.fullName} (${t.role.replace(/_/g, " ")})${spec}`;
}

export function useTeachingStaff() {
  const [staff, setStaff] = useState<TeachingStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await apiGet<TeachingStaffMember[]>("/academic/teaching-staff");
      setStaff(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load teaching staff");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const options = staff.map((t) => ({ value: t.id, label: staffLabel(t) }));

  return { staff, options, loading, error, reload: load };
}

export function useEligibleTeachers(subjectIds: string[], classId: string | undefined, enabled: boolean) {
  const [teachers, setTeachers] = useState<TeachingStaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectKey = [...new Set(subjectIds)].sort().join("|");

  useEffect(() => {
    if (!enabled || subjectIds.length === 0) {
      setTeachers([]);
      return;
    }
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const params = new URLSearchParams();
        for (const id of [...new Set(subjectIds)]) {
          params.append("subjectIds", id);
        }
        if (classId) params.set("classId", classId);
        const rows = await apiGet<TeachingStaffMember[]>(
          `/academic/teaching-staff/eligible?${params.toString()}`,
        );
        setTeachers(rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load eligible teachers");
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [subjectKey, classId, enabled]);

  const options = [
    { value: "", label: "— Unassigned —" },
    ...teachers.map((t) => ({ value: t.id, label: staffLabel(t) })),
  ];

  return { teachers, options, loading, error };
}
