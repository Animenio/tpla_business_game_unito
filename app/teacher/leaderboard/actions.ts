"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacherGameContext } from "@/src/lib/game/context";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function routeError(message: string) {
  return `/teacher/leaderboard?error=${encodeURIComponent(message)}`;
}

export async function setAiSubmissionFormAction(formData: FormData) {
  const url = value(formData, "form_url");
  const { supabase, session } = await requireTeacherGameContext();

  const { error } = await supabase.rpc("teacher_set_ai_submission_form_url", {
    p_session_id: session.id,
    p_url: url,
  });

  if (error) {
    redirect(
      routeError(
        error.message.includes("INVALID_URL")
          ? "Inserisci un URL HTTPS valido per il modulo di consegna."
          : "Impossibile aggiornare il modulo di consegna.",
      ),
    );
  }

  revalidatePath("/teacher/leaderboard");
  revalidatePath("/ai-chat");
  redirect("/teacher/leaderboard");
}

export async function verifyAiEvidenceAction(formData: FormData) {
  const teamId = value(formData, "team_id");
  const { supabase } = await requireTeacherGameContext();

  const { error } = await supabase.rpc("teacher_verify_ai_evidence", {
    p_team_id: teamId,
  });

  if (error) {
    redirect(
      routeError(
        error.message.includes("AI_EVIDENCE_NOT_FOUND")
          ? "Non risulta ancora una consegna AI per questo team."
          : "Impossibile verificare la consegna AI.",
      ),
    );
  }

  revalidatePath("/teacher/leaderboard");
  revalidatePath("/final");
  redirect("/teacher/leaderboard");
}
