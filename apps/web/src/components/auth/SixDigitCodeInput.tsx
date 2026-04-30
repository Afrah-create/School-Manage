"use client";

import { useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function SixDigitCodeInput({ value, onChange, error }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const setDigit = (index: number, next: string) => {
    const char = next.replace(/\D/g, "").slice(-1);
    const arr = digits.slice();
    arr[index] = char;
    const joined = arr.join("");
    onChange(joined);
    if (char && index < 5) refs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, key: string) => {
    if (key === "Backspace" && !digits[index] && index > 0) refs.current[index - 1]?.focus();
  };

  return (
    <div>
      <label className="font-body mb-2 block text-sm font-medium text-slate-700">6-digit code</label>
      <div className="flex items-center gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => setDigit(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(index, e.key)}
            className={[
              "font-heading h-11 w-11 rounded-xl border text-center text-lg outline-none transition",
              error
                ? "border-red-400 bg-red-50 text-red-700"
                : "border-slate-200 bg-white text-slate-800 focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]",
            ].join(" ")}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
