import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export const SELECTED_SESSION_COOKIE = "cfo_selected_session";

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
    .eq("role", "student")
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    const { data: staffMembership } = await supabase
      .from("session_members")
      .select("session_id")
      .eq("user_id", user.id)
      .in("role", ["teacher", "admin"])
      .limit(1)
      .maybeSingle();

    if (staffMembership) {
      redirect("/teacher");
    }

    redirect("/team");
  }

  const [{ data: session }, { data: profile }] = await Promise.all([
    supabase
      .from("game_sessions")
      .select(
        "id, code, title, status, model_version, started_at, academic_year, is_test, results_released_at",
      )
      .eq("id", membership.session_id)
      .single(),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", user.id)
      .single(),
  ]);

  if (!session || !profile) {
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

  const [{ data: memberships }, { data: profile }] = await Promise.all([
    supabase
      .from("session_members")
      .select("session_id, role, joined_at")
      .eq("user_id", user.id)
      .in("role", ["teacher", "admin"])
      .order("joined_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", user.id)
      .single(),
  ]);

  if (!memberships?.length || !profile) {
    redirect("/team");
  }

  const sessionIds = memberships.map((item) => item.session_id);
  const { data: sessions } = await supabase
    .from("game_sessions")
    .select(
      "id, code, title, status, model_version, started_at, academic_year, is_test, results_released_at",
    )
    .in("id", sessionIds);

  const sessionMap = new Map((sessions ?? []).map((session) => [session.id, session]));
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(SELECTED_SESSION_COOKIE)?.value;

  const selectedMembership = selectedId
    ? memberships.find((item) => {
        const session = sessionMap.get(item.session_id);
        return item.session_id === selectedId && session?.status !== "archived";
      })
    : undefined;

  const membership =
    selectedMembership ??
    memberships.find((item) => sessionMap.get(item.session_id)?.status !== "archived");

  if (!membership) {
    redirect("/admin/sessions?notice=no-active-session");
  }

  const session = sessionMap.get(membership.session_id);

  if (!session) {
    redirect("/admin/sessions?notice=session-not-found");
  }

  return { supabase, user, profile, membership, session };
}
