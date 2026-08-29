import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export async function getMeuPerfil(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data ?? null;
}

export async function getMembrosDaCasa(householdId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("household_id", householdId)
    .order("papel", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;

  // Se houver perfis duplicados com o mesmo nome, mantém o mais recente.
  // Isso evita que cadastros antigos apareçam duplicados em "Atribuir a" e
  // garante preferência pelo perfil atual quando houve recriação do usuário.
  const unicos = new Map<string, Profile>();
  for (const perfil of data ?? []) {
    const chave = perfil.nome.trim().toLocaleLowerCase();
    if (!unicos.has(chave)) unicos.set(chave, perfil);
  }
  return Array.from(unicos.values());
}
