"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function universityEmail(email: string) {
  return email.endsWith("@edu.unito.it") || email.endsWith("@unito.it");
}

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://cfo-ai-business-game-unito.vercel.app"
  ).replace(/\/$/, "");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = value(formData, "email").toLowerCase();

  if (!email || !universityEmail(email)) {
    redirect("/forgot-password?sent=1");
  }

  const supabase = await createClient();

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/auth/reset-password`,
  });

  redirect("/forgot-password?sent=1");
}

export async function updatePasswordAction(formData: FormData) {
  const password = value(formData, "password");
  const confirmPassword = value(formData, "confirm_password");

  if (password.length < 8) {
    redirect(
      "/auth/reset-password?error=" +
        encodeURIComponent("La password deve contenere almeno 8 caratteri."),
    );
  }

  if (password !== confirmPassword) {
    redirect(
      "/auth/reset-password?error=" +
        encodeURIComponent("Le due password non coincidono."),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/forgot-password?error=" +
        encodeURIComponent(
          "Il link di recupero non è valido o è scaduto. Richiedine uno nuovo.",
        ),
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(
      "/auth/reset-password?error=" +
        encodeURIComponent("Impossibile aggiornare la password. Riprova."),
    );
  }

  await supabase.auth.signOut();
  redirect("/?mode=login&message=password-updated");
}
