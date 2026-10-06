"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    const supabase = createClient();
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
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_rounds",
          filter: `session_id=eq.${sessionId}`,
        },
        () => router.refresh(),
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
          () => router.refresh(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "team_round_results",
            filter: `team_id=eq.${teamId}`,
          },
          () => router.refresh(),
        );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, roundId, sessionId, teamId]);

  return null;
}
