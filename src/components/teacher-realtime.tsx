"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";

interface TeacherRealtimeProps {
  sessionId: string;
}

export function TeacherRealtime({ sessionId }: TeacherRealtimeProps) {
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

    const checkTeacherState = async () => {
      const [
        { data: session },
        { data: scores },
        { data: submissions },
      ] = await Promise.all([
        supabase
          .from("game_sessions")
          .select("*")
          .eq("id", sessionId)
          .maybeSingle(),
        supabase
          .from("team_final_scores")
          .select("id, calculated_at")
          .eq("session_id", sessionId)
          .order("calculated_at", { ascending: true }),
        supabase
          .from("team_ai_submissions")
          .select("id, status, submitted_at, verified_at")
          .eq("session_id", sessionId)
          .order("submitted_at", { ascending: true }),
      ]);

      if (cancelled) return;

      const signature = JSON.stringify({ session, scores, submissions });

      if (lastSignature.current === null) {
        lastSignature.current = signature;
        return;
      }

      if (lastSignature.current !== signature) {
        lastSignature.current = signature;
        refresh();
      }
    };

    const channel = supabase
      .channel(`teacher-session-${sessionId}`)
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
          table: "session_members",
          filter: `session_id=eq.${sessionId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
          filter: `session_id=eq.${sessionId}`,
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
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_final_scores",
          filter: `session_id=eq.${sessionId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_ai_submissions",
          filter: `session_id=eq.${sessionId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
        },
        refresh,
      )
      .subscribe();

    void checkTeacherState();
    const interval = window.setInterval(() => {
      void checkTeacherState();
    }, 5000);

    const onFocus = () => {
      void checkTeacherState();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [router, sessionId]);

  return null;
}
