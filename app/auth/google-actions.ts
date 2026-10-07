"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PENDING_GOOGLE_SESSION_COOKIE } from "@/src/lib/auth/google";
import { createClient } from "@/src/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function withError(path: string, message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}error=${encodeURIComponent(message)}`;
}

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://cfo-ai-business-game-unito.vercel.app"
  ).replace(/\/$/, "");
}

export async function signInWithGoogleAction(formData: FormData) {
  const mode = value(formData, "mode") === "register" ? "register" : "login";
  const sessionCode = value(formData, "session_code").toUpperCase();

  if (mode === "register" && !sessionCode) {
    redirect(
      withError(
        "/?mode=register",
        "Inserisci il codice sessione prima di continuare con Google.",
      ),
    );
  }

  const cookieStore = await cookies();

  if (sessionCode) {
    cookieStore.set(PENDING_GOOGLE_SESSION_COOKIE, sessionCode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
  } else {
    cookieStore.delete(PENDING_GOOGLE_SESSION_COOKIE);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl()}/auth/callback`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    redirect(
      withError(
        `/?mode=${mode}`,
        "Accesso con Google non disponibile. Riprova tra poco.",
      ),
    );
  }

  redirect(data.url);
}
