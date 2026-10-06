"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function withError(path: string, message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}error=${encodeURIComponent(message)}`;
}

function universityEmail(email: string) {
  const normalized = email.toLowerCase();
  return (
    normalized.endsWith("@edu.unito.it") ||
    normalized.endsWith("@unito.it")
  );
}

export async function registerAction(formData: FormData) {
  const firstName = value(formData, "first_name");
  const lastName = value(formData, "last_name");
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const sessionCode = value(formData, "session_code").toUpperCase();

  if (!firstName || !lastName) {
    redirect(withError("/?mode=register", "Inserisci nome e cognome."));
  }

  if (!universityEmail(email)) {
    redirect(
      withError(
        "/?mode=register",
        "Utilizza il tuo indirizzo email universitario UniTo.",
      ),
    );
  }

  if (password.length < 8) {
    redirect(
      withError(
        "/?mode=register",
        "La password deve contenere almeno 8 caratteri.",
      ),
    );
  }

  const supabase = await createClient();

  const { data: validSession, error: sessionError } = await supabase.rpc(
    "validate_session_code",
    { p_code: sessionCode },
  );

  if (sessionError || !validSession) {
    redirect(
      withError(
        "/?mode=register",
        "Codice sessione non valido o registrazioni non aperte.",
      ),
    );
  }

  const fullName = `${firstName} ${lastName}`.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        session_code: sessionCode,
      },
    },
  });

  if (error) {
    redirect(withError("/?mode=register", error.message));
  }

  if (!data.session) {
    redirect("/check-email");
  }

  redirect("/team");
}

export async function loginAction(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      withError(
        "/?mode=login",
        "Credenziali non valide. Controlla email e password.",
      ),
    );
  }

  if (data.user) {
    const { data: staffMembership } = await supabase
      .from("session_members")
      .select("session_id")
      .eq("user_id", data.user.id)
      .in("role", ["teacher", "admin"])
      .limit(1)
      .maybeSingle();

    if (staffMembership) {
      redirect("/teacher");
    }
  }

  redirect("/team");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
