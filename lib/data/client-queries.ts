import { createClient } from "@/lib/supabase/client";
import type { Transaction } from "@/lib/types/database";

export async function fetchTransacoesDoMes(month: number, year: number): Promise<Transaction[]> {
  const supabase = createClient();
  const m = String(month + 1).padStart(2, "0");
  const start = `${year}-${m}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${m}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("data", start)
    .lte("data", end)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
