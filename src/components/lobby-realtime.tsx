"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";

interface LobbyRealtimeProps {
  teamId: string;
  sessionId: string;
}

export function LobbyRealtime({
  teamId,
  sessionId,
}: LobbyRealtimeProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`lobby:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `team_id=eq.${teamId}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
          filter: `id=eq.${teamId}`,
        },
        () => router.refresh(),
      )
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, sessionId, teamId]);

  return null;
}
