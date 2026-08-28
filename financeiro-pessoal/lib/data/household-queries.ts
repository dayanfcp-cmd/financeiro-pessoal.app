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
    .order("papel", { ascending: true }); // "dono" antes de "membro" (ordem alfabética favorece)
  if (error) throw error;
  return data ?? [];
}
