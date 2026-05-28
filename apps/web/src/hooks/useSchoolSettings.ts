"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SchoolSettings, UpdateSchoolSettingsInput } from "@uganda-cbc-sms/shared";
import { apiGet, apiPut } from "@/lib/api";

export function useSchoolSettings() {
  return useQuery({
    queryKey: ["school-settings"],
    queryFn: () => apiGet<SchoolSettings>("/settings"),
  });
}

export function useSchoolSettingsActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSchoolSettingsInput) => apiPut<SchoolSettings>("/settings", payload),
    onSuccess: (data) => {
      qc.setQueryData(["school-settings"], data);
      void qc.invalidateQueries({ queryKey: ["school-settings"] });
    },
  });
}
