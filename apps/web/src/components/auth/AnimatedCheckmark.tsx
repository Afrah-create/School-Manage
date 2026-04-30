"use client";

import { motion } from "framer-motion";

export function AnimatedCheckmark({ size = 72, color = "#10B981" }: { size?: number; color?: string }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.circle
        cx="26"
        cy="26"
        r="23"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray="145"
        initial={{ strokeDashoffset: 145 }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      <motion.path
        d="M14 27l8 8 16-16"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="36"
        initial={{ strokeDashoffset: 36 }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
      />
    </motion.svg>
  );
}
