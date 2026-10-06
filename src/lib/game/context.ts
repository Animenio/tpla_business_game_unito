import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export async function requireStudentGameContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?mode=login");
  }

  const { data: membership } = await supabase
    .from("session_members")
    .select("session_id, role, joined_at")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/team");
  }

  if (membership.role === "teacher" || membership.role === "admin") {
    redirect("/teacher");
  }

  const [{ data: session }, { data: profile }] = await Promise.all([
    supabase
      .from("game_sessions")
      .select(
        "id, code, title, status, model_version, started_at, academic_year",
      )
      .eq("id", membership.session_id)
      .single(),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", user.id)
      .single(),
  ]);

  if (!session) {
    redirect("/team");
  }

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  const teamIds = (memberships ?? []).map((item) => item.team_id);

  if (!teamIds.length) {
    redirect("/team");
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id, session_id, name, join_code, status")
    .in("id", teamIds)
    .eq("session_id", session.id)
    .maybeSingle();

  if (!team) {
    redirect("/team");
  }

  return { supabase, user, profile, membership, session, team };
}

export async function requireTeacherGameContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?mode=login");
  }

  const { data: membership } = await supabase
    .from("session_members")
    .select("session_id, role, joined_at")
    .eq("user_id", user.id)
    .in("role", ["teacher", "admin"])
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/team");
  }

  const [{ data: session }, { data: profile }] = await Promise.all([
    supabase
      .from("game_sessions")
      .select(
        "id, code, title, status, model_version, started_at, academic_year",
      )
      .eq("id", membership.session_id)
      .single(),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", user.id)
      .single(),
  ]);

  if (!session) {
    redirect("/team");
  }

  return { supabase, user, profile, membership, session };
}
