"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";

interface RoundTimerProps {
  closesAt: string | null;
  roundId?: string;
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

export function RoundTimer({
  closesAt,
  roundId,
  compact = false,
}: RoundTimerProps) {
  const [effectiveClosesAt, setEffectiveClosesAt] = useState(closesAt);
  const [seconds, setSeconds] = useState(() => remainingSeconds(closesAt));

  useEffect(() => {
    setEffectiveClosesAt(closesAt);
  }, [closesAt]);

  useEffect(() => {
    setSeconds(remainingSeconds(effectiveClosesAt));

    if (!effectiveClosesAt) return;

    const timer = window.setInterval(() => {
      setSeconds(remainingSeconds(effectiveClosesAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [effectiveClosesAt]);

  useEffect(() => {
    if (!roundId) return;

    const supabase = createClient();
    let cancelled = false;

    const syncClosesAt = async () => {
      const { data } = await supabase
        .from("game_rounds")
        .select("closes_at")
        .eq("id", roundId)
        .maybeSingle();

      if (!cancelled && data?.closes_at) {
        setEffectiveClosesAt(data.closes_at);
      }
    };

    const channel = supabase
      .channel(`round-timer:${roundId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rounds",
          filter: `id=eq.${roundId}`,
        },
        (payload) => {
          const next = payload.new as { closes_at?: string | null };
          if (!cancelled && next.closes_at) {
            setEffectiveClosesAt(next.closes_at);
          }
        },
      )
      .subscribe();

    void syncClosesAt();
    const poll = window.setInterval(() => {
      void syncClosesAt();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [roundId]);

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
