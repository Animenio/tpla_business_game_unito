import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { PENDING_GOOGLE_SESSION_COOKIE } from "@/src/lib/auth/google";
import { SELECTED_SESSION_COOKIE } from "@/src/lib/game/context";
import { createClient } from "@/src/lib/supabase/server";

function universityEmail(email: string | null | undefined) {
  const normalized = (email ?? "").toLowerCase();
  return (
    normalized.endsWith("@edu.unito.it") ||
    normalized.endsWith("@unito.it")
  );
}

function oauthError(message: string) {
  return "/?mode=login&error=" + encodeURIComponent(message);
}

function joinError(message: string) {
  if (message.includes("UNSUPPORTED_EMAIL_DOMAIN")) {
    return "Usa l’account Google istituzionale UniTo (@edu.unito.it o @unito.it).";
  }
  if (message.includes("SESSION_NOT_FOUND")) {
    return "Codice sessione non valido.";
  }
  if (message.includes("SESSION_ARCHIVED")) {
    return "Questa sessione è archiviata.";
  }
  if (message.includes("REGISTRATION_CLOSED")) {
    return "Le registrazioni per questa sessione sono chiuse.";
  }
  if (message.includes("TARGET_IN_STUDENT_TEAM")) {
    return "Questo account è già associato a un team studente nella sessione.";
  }
  if (
    message.includes("GOOGLE_PROVIDER_REQUIRED") ||
    message.includes("VERIFIED_EMAIL_REQUIRED")
  ) {
    return "Non è stato possibile verificare l’identità Google UniTo.";
  }
  return "Impossibile associare l’account Google alla sessione.";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    redirect(oauthError("Accesso Google non completato."));
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    redirect(oauthError("Accesso Google non valido o scaduto. Riprova."));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !universityEmail(user.email)) {
    await supabase.auth.signOut();
    redirect(
      oauthError(
        "Usa l’account Google istituzionale UniTo (@edu.unito.it o @unito.it).",
      ),
    );
  }

  const cookieStore = await cookies();
  const pendingSessionCode = cookieStore.get(
    PENDING_GOOGLE_SESSION_COOKIE,
  )?.value;

  if (pendingSessionCode) {
    const { data, error } = await supabase.rpc(
      "complete_google_session_join",
      {
        p_session_code: pendingSessionCode,
      },
    );

    cookieStore.delete(PENDING_GOOGLE_SESSION_COOKIE);

    if (error || !data?.length) {
      await supabase.auth.signOut();
      redirect(
        "/?mode=register&error=" +
          encodeURIComponent(joinError(error?.message ?? "UNKNOWN")),
      );
    }

    const joined = data[0];

    if (joined.assigned_role === "teacher" || joined.assigned_role === "admin") {
      cookieStore.set(SELECTED_SESSION_COOKIE, joined.session_id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
      });
      redirect("/teacher");
    }

    redirect("/team");
  }

  const { data: memberships } = await supabase
    .from("session_members")
    .select("session_id, role, joined_at")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  if (!memberships?.length) {
    await supabase.auth.signOut();
    redirect(
      "/?mode=register&error=" +
        encodeURIComponent(
          "Account Google UniTo verificato. Inserisci il codice sessione nella scheda Registrati per partecipare.",
        ),
    );
  }

  const staffMembership = memberships.find(
    (membership) =>
      membership.role === "teacher" || membership.role === "admin",
  );

  if (staffMembership) {
    redirect("/teacher");
  }

  redirect("/team");
}
