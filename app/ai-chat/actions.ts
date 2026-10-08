"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStudentGameContext } from "@/src/lib/game/context";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function withError(message: string) {
  return `/ai-chat?error=${encodeURIComponent(message)}`;
}

function evidenceError(message: string) {
  if (message.includes("INVALID_PROVIDER")) return "Seleziona il modello AI utilizzato.";
  if (message.includes("CONFIRMATION_REQUIRED")) {
    return "Conferma di aver rimosso eventuali contenuti personali o non pertinenti.";
  }
  if (message.includes("INVALID_REFERENCE_URL")) return "Il link inserito non è valido.";
  if (message.includes("SUBMISSION_FORM_NOT_CONFIGURED")) {
    return "Il docente non ha ancora pubblicato il modulo di consegna.";
  }
  if (message.includes("COMPLETED_TEAM_NOT_FOUND")) {
    return "La simulazione non risulta ancora completata per il tuo team.";
  }
  return "Impossibile registrare la consegna. Riprova.";
}

export async function submitAiEvidenceAction(formData: FormData) {
  const provider = value(formData, "provider");
  const externalReferenceUrl = value(formData, "external_reference_url");
  const confirmed = formData.get("confirmed_cleaned") === "on";

  const { supabase } = await requireStudentGameContext();

  const { error } = await supabase.rpc("submit_ai_evidence", {
    p_provider: provider,
    p_confirmed_cleaned: confirmed,
    p_external_reference_url: externalReferenceUrl || undefined,
  });

  if (error) {
    redirect(withError(evidenceError(error.message)));
  }

  revalidatePath("/ai-chat");
  revalidatePath("/final");
  redirect("/ai-chat");
}
