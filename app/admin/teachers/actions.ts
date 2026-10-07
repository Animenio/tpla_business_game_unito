"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacherGameContext } from "@/src/lib/game/context";
import type { Database } from "@/src/types/database";

type AppRole = Database["public"]["Enums"]["app_role"];

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function withError(message: string) {
  return `/admin/teachers?error=${encodeURIComponent(message)}`;
}

function translateError(message: string) {
  if (message.includes("ADMIN_REQUIRED")) {
    return "Solo un amministratore può gestire gli accessi del personale.";
  }
  if (message.includes("INVALID_UNITO_EMAIL")) {
    return "Inserisci un indirizzo email UniTo valido.";
  }
  if (message.includes("INVALID_STAFF_ROLE")) {
    return "Ruolo staff non valido.";
  }
  if (message.includes("TARGET_IN_STUDENT_TEAM")) {
    return "L’account è ancora associato a un team studente. Rimuovilo dal team prima della promozione.";
  }
  if (message.includes("CANNOT_REVOKE_SELF")) {
    return "Non puoi revocare il tuo stesso accesso amministratore.";
  }
  if (message.includes("AUTHORIZATION_NOT_FOUND")) {
    return "Autorizzazione non trovata o già revocata.";
  }
  return "Operazione non completata. Riprova.";
}

export async function authorizeStaffAction(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const role = value(formData, "role") as AppRole;
  const { supabase, session, membership } = await requireTeacherGameContext();

  if (membership.role !== "admin") {
    redirect(withError("Solo un amministratore può autorizzare docenti."));
  }

  const { error } = await supabase.rpc("admin_authorize_staff", {
    p_session_id: session.id,
    p_email: email,
    p_role: role,
  });

  if (error) {
    redirect(withError(translateError(error.message)));
  }

  revalidatePath("/admin/teachers");
  revalidatePath("/teacher");
  redirect("/admin/teachers?updated=1");
}

export async function revokeStaffAction(formData: FormData) {
  const authorizationId = value(formData, "authorization_id");
  const { supabase, membership } = await requireTeacherGameContext();

  if (membership.role !== "admin") {
    redirect(withError("Solo un amministratore può revocare accessi staff."));
  }

  const { error } = await supabase.rpc("admin_revoke_staff", {
    p_authorization_id: authorizationId,
  });

  if (error) {
    redirect(withError(translateError(error.message)));
  }

  revalidatePath("/admin/teachers");
  revalidatePath("/teacher");
  redirect("/admin/teachers?updated=1");
}
