"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { AcademicLevel } from "@/lib/academicLevel";
import { parseAcademicLevel } from "@/lib/academicLevel";

export function useAcademicLevelScope(defaultLevel: AcademicLevel = "O_LEVEL") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const level = useMemo(
    () => parseAcademicLevel(searchParams.get("level") ?? defaultLevel),
    [searchParams, defaultLevel],
  );

  const setLevel = useCallback(
    (next: AcademicLevel) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("level", next);
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const hrefWithLevel = useCallback(
    (basePath: string, extra?: Record<string, string>) => {
      const p = new URLSearchParams();
      p.set("level", level);
      if (extra) {
        for (const [k, v] of Object.entries(extra)) {
          if (v) p.set(k, v);
        }
      }
      const q = p.toString();
      return `${basePath}${q ? `?${q}` : ""}`;
    },
    [level],
  );

  return { level, setLevel, hrefWithLevel };
}
