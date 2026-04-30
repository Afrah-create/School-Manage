import { ReactNode } from "react";
import { motion } from "framer-motion";
import { authPageMotion, authPageTransition } from "./AuthMotion";

type AuthCardProps = {
  children: ReactNode;
  motionKey: string;
};

export function AuthCard({ children, motionKey }: AuthCardProps) {
  return (
    <motion.div
      key={motionKey}
      variants={authPageMotion}
      initial="enter"
      animate="center"
      exit="exit"
      transition={authPageTransition}
      className="w-full"
    >
      <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-40px_rgba(37,99,235,0.5)] backdrop-blur-xl sm:p-6">
        {children}
      </div>
    </motion.div>
  );
}
