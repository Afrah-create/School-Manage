import { useEffect, useMemo, useState } from "react";

export function useCountdown(initialSeconds: number, autoStart = true) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [running, setRunning] = useState(autoStart);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [running, secondsLeft]);

  const progress = useMemo(() => {
    if (initialSeconds <= 0) return 0;
    return Math.max(0, Math.min(1, secondsLeft / initialSeconds));
  }, [initialSeconds, secondsLeft]);

  const reset = (nextSeconds = initialSeconds) => {
    setSecondsLeft(nextSeconds);
    setRunning(true);
  };

  const stop = () => setRunning(false);
  const start = () => setRunning(true);

  return {
    secondsLeft,
    running,
    progress,
    setSecondsLeft,
    reset,
    stop,
    start,
  };
}
