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

    const checkSessionState = async () => {
      const { data } = await supabase
        .from("game_sessions")
        .select("status")
        .eq("id", sessionId)
        .maybeSingle();

      if (data?.status === "live") {
        router.replace("/case-study");
        return;
      }

      if (data?.status === "completed") {
        router.replace("/final");
        return;
      }

      router.refresh();
    };

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
          event: "UPDATE",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const status = String(payload.new.status ?? "");

          if (status === "live") {
            router.replace("/case-study");
            return;
          }

          if (status === "completed") {
            router.replace("/final");
            return;
          }

          router.refresh();
        },
      )
      .subscribe();

    void checkSessionState();

    const interval = window.setInterval(() => {
      void checkSessionState();
    }, 10000);

    const onFocus = () => {
      void checkSessionState();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [router, sessionId, teamId]);

  return null;
}
