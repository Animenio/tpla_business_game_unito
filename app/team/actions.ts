"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function teamError(message: string) {
  return `/team?error=${encodeURIComponent(message)}`;
}

function translateRpcError(message: string) {
  if (message.includes("USER_ALREADY_IN_TEAM_FOR_SESSION")) {
    return "Sei già associato a un team per questa sessione.";
  }
  if (message.includes("TEAM_NOT_FOUND")) {
    return "Codice team non valido.";
  }
  if (message.includes("TEAM_OUTSIDE_SESSION")) {
    return "Il team appartiene a una sessione diversa.";
  }
  if (message.includes("NO_OPEN_SESSION")) {
    return "La sessione non accetta nuove registrazioni.";
  }
  if (message.includes("INVALID_TEAM_NAME")) {
    return "Il nome del team deve contenere da 2 a 60 caratteri.";
  }
  return "Operazione non riuscita. Riprova.";
}

export async function createTeamAction(formData: FormData) {
  const name = value(formData, "team_name");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { error } = await supabase.rpc("create_team", {
    p_name: name,
  });

  if (error) {
    redirect(teamError(translateRpcError(error.message)));
  }

  redirect("/lobby");
}

export async function joinTeamAction(formData: FormData) {
  const code = value(formData, "team_code").toUpperCase();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { error } = await supabase.rpc("join_team", {
    p_code: code,
  });

  if (error) {
    redirect(teamError(translateRpcError(error.message)));
  }

  redirect("/lobby");
}

export async function leaveTeamAction(formData: FormData) {
  const teamId = value(formData, "team_id");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { error } = await supabase.rpc("leave_team", {
    p_team_id: teamId,
  });

  if (error) {
    redirect(
      `/lobby?error=${encodeURIComponent("Impossibile uscire dal team.")}`,
    );
  }

  redirect("/team");
}
