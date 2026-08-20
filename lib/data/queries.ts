import { createClient } from "@/lib/supabase/server";
import type { Account, Card, Category, Transaction, CategoryTree } from "@/lib/types/database";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("ativo", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCards(): Promise<Card[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cards").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function buildCategoryTree(categories: Category[]): CategoryTree[] {
  const roots = categories.filter((c) => !c.parent_id);
  return roots.map((root) => ({
    ...root,
    subs: categories.filter((c) => c.parent_id === root.id),
  }));
}

/** Transações do usuário, mais recentes primeiro. Opcionalmente filtra por mês (0-11) e ano. */
export async function getTransactions(opts?: {
  month?: number;
  year?: number;
  limit?: number;
}): Promise<Transaction[]> {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select("*")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });

  if (opts?.month !== undefined && opts?.year !== undefined) {
    const m = String(opts.month + 1).padStart(2, "0");
    const start = `${opts.year}-${m}-01`;
    const lastDay = new Date(opts.year, opts.month + 1, 0).getDate();
    const end = `${opts.year}-${m}-${String(lastDay).padStart(2, "0")}`;
    query = query.gte("data", start).lte("data", end);
  }
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getDefaultSourceId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sources")
    .select("id")
    .eq("tipo", "manual")
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
