import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export type GradingScaleRow = {
  id?: string;
  level: "O_LEVEL" | "A_LEVEL";
  grade: string;
  minScore: number;
  maxScore: number;
  points: number;
  descriptor?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export function useGradingScales(level: "O_LEVEL" | "A_LEVEL") {
  return useQuery({
    queryKey: ["grading-scales", level],
    queryFn: () => apiGet<GradingScaleRow[]>(`/academic/grading-scales?level=${encodeURIComponent(level)}`),
    staleTime: 60_000,
  });
}
