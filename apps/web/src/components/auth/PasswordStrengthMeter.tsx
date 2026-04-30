"use client";

import { motion } from "framer-motion";
import { PasswordStrengthLabel } from "@/hooks/usePasswordStrength";

const segmentColors = ["#EF4444", "#F59E0B", "#2563EB", "#10B981"];

export function PasswordStrengthMeter({ score, label }: { score: number; label: PasswordStrengthLabel }) {
  const clamped = Math.max(0, Math.min(4, score));
  const width = `${(clamped / 4) * 100}%`;
  const color = segmentColors[Math.max(0, clamped - 1)] ?? segmentColors[0];

  return (
    <div className="mt-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full"
          animate={{ width, backgroundColor: color }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className="font-body mt-1 text-xs text-slate-500">
        Strength: <span className="font-semibold">{label}</span>
      </p>
    </div>
  );
}
