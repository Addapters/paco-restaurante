import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente com service role — ignora RLS. Usar APENAS no servidor e apenas
// para operações pontuais que o RLS não cobre (ex.: resolver o QR de uma
// mesa para visitantes anónimos). Nunca importar em Client Components.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
