"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";

interface GameRealtimeProps {
  sessionId: string;
  teamId?: string;
  roundId?: string;
}

export function GameRealtime({
  sessionId,
  teamId,
  roundId,
}: GameRealtimeProps) {
  const router = useRouter();
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const refresh = () => {
      if (!cancelled) {
        router.refresh();
      }
    };

    const checkGameState = async () => {
      const [{ data: session }, { data: rounds }] = await Promise.all([
        supabase
          .from("game_sessions")
          .select("status")
          .eq("id", sessionId)
          .maybeSingle(),
        supabase
          .from("game_rounds")
          .select("id, round_number, status, opens_at, closes_at, closed_at")
          .eq("session_id", sessionId)
          .order("round_number", { ascending: true }),
      ]);

      if (cancelled) return;

      const signature = JSON.stringify({
        sessionStatus: session?.status ?? null,
        rounds:
          rounds?.map((round) => ({
            id: round.id,
            roundNumber: round.round_number,
            status: round.status,
            opensAt: round.opens_at,
            closesAt: round.closes_at,
            closedAt: round.closed_at,
          })) ?? [],
      });

      if (lastSignature.current === null) {
        lastSignature.current = signature;
        return;
      }

      if (lastSignature.current !== signature) {
        lastSignature.current = signature;
        refresh();
      }
    };

    let channel = supabase
      .channel(`game-state:${sessionId}:${teamId ?? "all"}:${roundId ?? "none"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${sessionId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_rounds",
          filter: `session_id=eq.${sessionId}`,
        },
        refresh,
      );

    if (teamId) {
      channel = channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "team_round_decisions",
            filter: `team_id=eq.${teamId}`,
          },
          refresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "team_round_results",
            filter: `team_id=eq.${teamId}`,
          },
          refresh,
        );
    } else if (roundId) {
      channel = channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "team_round_decisions",
            filter: `round_id=eq.${roundId}`,
          },
          refresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "team_round_results",
            filter: `round_id=eq.${roundId}`,
          },
          refresh,
        );
    }

    channel.subscribe();

    // Realtime remains the primary path. This lightweight poll is a safety
    // net for browsers/tabs that miss a websocket event.
    void checkGameState();
    const interval = window.setInterval(() => {
      void checkGameState();
    }, 5000);

    const onFocus = () => {
      void checkGameState();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [router, roundId, sessionId, teamId]);

  return null;
}
