import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      redirect(next);
    }
  }

  redirect(
    "/forgot-password?error=" +
      encodeURIComponent(
        "Il link non è valido o è scaduto. Richiedi un nuovo recupero password.",
      ),
  );
}
