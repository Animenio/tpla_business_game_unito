import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/src/types/database";

let browserClient:
  | ReturnType<typeof createBrowserClient<Database>>
  | undefined;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase non configurato: valorizza NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  browserClient ??= createBrowserClient<Database>(
    url,
    publishableKey,
  );
  return browserClient;
}
