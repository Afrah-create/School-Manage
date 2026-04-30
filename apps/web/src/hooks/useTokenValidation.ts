import { useEffect, useState } from "react";

type TokenState = "loading" | "valid" | "invalid";

export function useTokenValidation(token: string | null, delayMs = 1200) {
  const [state, setState] = useState<TokenState>("loading");

  useEffect(() => {
    setState("loading");
    const timer = setTimeout(() => {
      if (!token || token.trim().length < 10) {
        setState("invalid");
        return;
      }
      setState("valid");
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs, token]);

  return {
    isLoading: state === "loading",
    isValid: state === "valid",
    isInvalid: state === "invalid",
    state,
  };
}
