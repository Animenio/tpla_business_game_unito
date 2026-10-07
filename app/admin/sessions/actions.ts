"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { SELECTED_SESSION_COOKIE } from "@/src/lib/game/context";
import { DEFAULT_MODEL_VERSION } from "@/src/domain/simulation/model-version";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function routeError(message: string) {
  return `/admin/sessions?error=${encodeURIComponent(message)}`;
}

function translateError(message: string) {
  if (message.includes("ADMIN_REQUIRED")) {
    return "Solo un amministratore può creare, duplicare o archiviare sessioni.";
  }
  if (message.includes("INVALID_SESSION_CODE")) {
    return "Il codice deve contenere 4–32 caratteri: lettere maiuscole, numeri, trattino o underscore.";
  }
  if (message.includes("INVALID_SESSION_TITLE")) {
    return "Inserisci un nome sessione valido.";
  }
  if (message.includes("SESSION_CODE_EXISTS")) {
    return "Questo codice sessione è già utilizzato.";
  }
  if (message.includes("SESSION_NOT_FOUND")) {
    return "Sessione non trovata.";
  }
  return "Operazione non completata. Riprova.";
}

async function setSessionCookie(sessionId: string) {
  const store = await cookies();
  store.set(SELECTED_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function createSessionAction(formData: FormData) {
  const code = value(formData, "code").toUpperCase();
  const title = value(formData, "title");
  const academicYear = value(formData, "academic_year");
  const modelVersion =
    value(formData, "model_version") || DEFAULT_MODEL_VERSION;
  const isTest = value(formData, "session_type") === "test";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_create_session", {
    p_code: code,
    p_title: title,
    p_academic_year: academicYear,
    p_model_version: modelVersion,
    p_is_test: isTest,
  });

  if (error || !data) {
    redirect(routeError(translateError(error?.message ?? "UNKNOWN")));
  }

  await setSessionCookie(data);
  revalidatePath("/admin/sessions");
  revalidatePath("/teacher");
  redirect("/teacher");
}

export async function duplicateSessionAction(formData: FormData) {
  const sourceSessionId = value(formData, "source_session_id");
  const code = value(formData, "code").toUpperCase();
  const title = value(formData, "title");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_duplicate_session", {
    p_source_session_id: sourceSessionId,
    p_code: code,
    p_title: title,
  });

  if (error || !data) {
    redirect(routeError(translateError(error?.message ?? "UNKNOWN")));
  }

  await setSessionCookie(data);
  revalidatePath("/admin/sessions");
  revalidatePath("/teacher");
  redirect("/teacher");
}

export async function selectSessionAction(formData: FormData) {
  const sessionId = value(formData, "session_id");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?mode=login");
  }

  const { data: membership } = await supabase
    .from("session_members")
    .select("role")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .in("role", ["teacher", "admin"])
    .maybeSingle();

  if (!membership) {
    redirect(routeError("Non hai accesso staff a questa sessione."));
  }

  const { data: session } = await supabase
    .from("game_sessions")
    .select("status")
    .eq("id", sessionId)
    .single();

  if (!session || session.status === "archived") {
    redirect(routeError("La sessione è archiviata e non può essere selezionata."));
  }

  await setSessionCookie(sessionId);
  redirect(session.status === "completed" ? "/teacher/leaderboard" : "/teacher");
}

export async function archiveSessionAction(formData: FormData) {
  const sessionId = value(formData, "session_id");
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_archive_session", {
    p_session_id: sessionId,
  });

  if (error) {
    redirect(routeError(translateError(error.message)));
  }

  const store = await cookies();
  if (store.get(SELECTED_SESSION_COOKIE)?.value === sessionId) {
    store.delete(SELECTED_SESSION_COOKIE);
  }

  revalidatePath("/admin/sessions");
  revalidatePath("/teacher");
  redirect("/admin/sessions?updated=archived");
}
