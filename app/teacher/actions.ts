"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import type { Database } from "@/src/types/database";

type SessionStatus = Database["public"]["Enums"]["session_status"];
type TeamStatus = Database["public"]["Enums"]["team_status"];

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function withError(message: string) {
  return `/teacher?error=${encodeURIComponent(message)}`;
}

function teacherError(message: string) {
  switch (message) {
    case "FORBIDDEN":
      return "Non hai i permessi per gestire questa sessione.";
    case "TEAM_NOT_FOUND":
      return "Team non trovato.";
    case "SESSION_NOT_FOUND":
      return "Sessione non trovata.";
    case "SESSION_NOT_EDITABLE":
      return "I team non possono più essere modificati in questa fase.";
    case "TEAMS_NOT_CONFIRMED":
      return "Conferma tutti i team prima di avviare la simulazione.";
    case "UNASSIGNED_STUDENTS":
      return "Sono ancora presenti studenti senza team.";
    case "NO_TEAMS":
      return "Non è presente alcun team da avviare.";
    case "INVALID_SESSION_TRANSITION":
      return "Transizione di stato non consentita.";
    case "SESSION_NOT_RESTARTABLE":
      return "La simulazione può essere riavviata solo quando è già in corso o completata.";
    default:
      return "Operazione non completata. Riprova.";
  }
}

export async function setTeamStatusAction(formData: FormData) {
  const teamId = value(formData, "team_id");
  const status = value(formData, "status") as TeamStatus;

  if (!teamId || !["forming", "confirmed"].includes(status)) {
    redirect(withError("Dati team non validi."));
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_set_team_status", {
    p_team_id: teamId,
    p_status: status,
  });

  if (error) {
    redirect(withError(teacherError(error.message)));
  }

  revalidatePath("/teacher");
  redirect("/teacher");
}

export async function setSessionStatusAction(formData: FormData) {
  const sessionId = value(formData, "session_id");
  const status = value(formData, "status") as SessionStatus;

  if (
    !sessionId ||
    !["registration_open", "locked", "live"].includes(status)
  ) {
    redirect(withError("Dati sessione non validi."));
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_set_session_status", {
    p_session_id: sessionId,
    p_status: status,
  });

  if (error) {
    redirect(withError(teacherError(error.message)));
  }

  revalidatePath("/teacher");
  revalidatePath("/lobby");
  redirect("/teacher");
}


export async function restartSimulationAction(formData: FormData) {
  const sessionId = value(formData, "session_id");

  if (!sessionId) {
    redirect(withError("Sessione non valida."));
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_restart_simulation", {
    p_session_id: sessionId,
  });

  if (error) {
    redirect(withError(teacherError(error.message)));
  }

  revalidatePath("/teacher");
  revalidatePath("/lobby");
  revalidatePath("/case-study");
  revalidatePath("/rounds", "layout");
  revalidatePath("/final");
  redirect("/teacher");
}
