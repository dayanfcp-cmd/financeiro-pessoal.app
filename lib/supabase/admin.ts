import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente com privilégios de administrador (ignora RLS). Usa a
 * SUPABASE_SERVICE_ROLE_KEY — uma variável SEM o prefixo NEXT_PUBLIC_,
 * portanto nunca é enviada ao navegador, só existe no servidor.
 *
 * NUNCA importe este arquivo em um componente "use client".
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
