"use client";

import { useEffect, useMemo, useState } from "react";

interface RoundTimerProps {
  closesAt: string | null;
  compact?: boolean;
}

function remainingSeconds(closesAt: string | null) {
  if (!closesAt) return null;
  return Math.max(
    0,
    Math.floor((new Date(closesAt).getTime() - Date.now()) / 1000),
  );
}

function display(seconds: number | null) {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function RoundTimer({ closesAt, compact = false }: RoundTimerProps) {
  const [seconds, setSeconds] = useState(() => remainingSeconds(closesAt));

  useEffect(() => {
    setSeconds(remainingSeconds(closesAt));

    if (!closesAt) return;

    const timer = window.setInterval(() => {
      setSeconds(remainingSeconds(closesAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [closesAt]);

  const expired = useMemo(
    () => seconds !== null && seconds <= 0,
    [seconds],
  );

  return (
    <span
      className={
        compact
          ? expired
            ? "round-timer compact expired"
            : "round-timer compact"
          : expired
            ? "round-timer expired"
            : "round-timer"
      }
    >
      {display(seconds)}
    </span>
  );
}
