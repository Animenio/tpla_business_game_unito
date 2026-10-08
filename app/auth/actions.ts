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

  const { data: validAccess, error: sessionError } = await supabase.rpc(
    "validate_registration_access",
    {
      p_email: email,
      p_code: sessionCode,
    },
  );

  if (sessionError || !validAccess) {
    redirect(
      withError(
        "/?mode=register",
        "Codice sessione non valido, registrazioni non aperte o accesso staff non autorizzato.",
      ),
    );
  }

  const fullName = `${firstName} ${lastName}`.trim();

  const { data: existingSession } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (existingSession.user) {
    const { data: joined, error: joinError } = await supabase.rpc(
      "complete_authenticated_session_join",
      {
        p_session_code: sessionCode,
      },
    );

    if (joinError || !joined?.length) {
      await supabase.auth.signOut();
      redirect(
        withError(
          "/?mode=register",
          "Non è stato possibile registrare di nuovo l’account alla sessione.",
        ),
      );
    }

    const membership = joined[0];

    if (
      membership.assigned_role === "teacher" ||
      membership.assigned_role === "admin"
    ) {
      redirect("/teacher");
    }

    redirect("/team");
  }

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
