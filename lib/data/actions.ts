"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Gera a dedup_key para um lançamento manual — determinística por conta+data+valor+descrição. */
function dedupKeyManual(accountId: string, data: string, valor: number, desc: string) {
  const norm = normalizar(desc);
  return `manual:${accountId}:${data}:${valor.toFixed(2)}:${norm}:${randomUUID().slice(0, 8)}`;
  // o sufixo aleatório evita colisão em lançamentos manuais repetidos de propósito (ex.: dois cafés
  // iguais no mesmo dia); a deduplicação "de verdade" (sem sufixo) entra na etapa de importação.
}

export async function criarTransacao(input: {
  tipo: "receita" | "despesa";
  valor: number;
  descricao: string;
  data: string; // YYYY-MM-DD
  categoryId: string | null;
  contaOuCartaoId: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: source } = await supabase
    .from("sources")
    .select("id")
    .eq("tipo", "manual")
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: input.contaOuCartaoId,
    data: input.data,
    valor: input.valor,
    tipo: input.tipo,
    descricao_original: input.descricao,
    descricao_normalizada: normalizar(input.descricao),
    category_id: input.categoryId,
    source_id: source?.id ?? null,
    dedup_key: dedupKeyManual(input.contaOuCartaoId, input.data, input.valor, input.descricao),
    status: "efetivada",
  });

  if (error) throw error;
  revalidatePath("/");
}

/** Transferência entre contas próprias: grava DOIS lançamentos ligados, neutros no resultado. */
export async function criarTransferencia(input: {
  valor: number;
  descricao: string;
  data: string;
  contaDeId: string;
  contaParaId: string;
}) {
  if (input.contaDeId === input.contaParaId) {
    throw new Error("Escolha contas diferentes para a transferência.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: source } = await supabase
    .from("sources")
    .select("id")
    .eq("tipo", "manual")
    .limit(1)
    .maybeSingle();

  const transferGroupId = randomUUID();
  const desc = input.descricao || "Transferência";

  const { error } = await supabase.from("transactions").insert([
    {
      user_id: user.id,
      account_id: input.contaDeId,
      data: input.data,
      valor: input.valor,
      tipo: "transferencia",
      descricao_original: `${desc} (saída)`,
      descricao_normalizada: normalizar(desc),
      category_id: null,
      source_id: source?.id ?? null,
      dedup_key: dedupKeyManual(input.contaDeId, input.data, input.valor, desc + ":saida"),
      transfer_group_id: transferGroupId,
      status: "efetivada",
    },
    {
      user_id: user.id,
      account_id: input.contaParaId,
      data: input.data,
      valor: input.valor,
      tipo: "transferencia",
      descricao_original: `${desc} (entrada)`,
      descricao_normalizada: normalizar(desc),
      category_id: null,
      source_id: source?.id ?? null,
      dedup_key: dedupKeyManual(input.contaParaId, input.data, input.valor, desc + ":entrada"),
      transfer_group_id: transferGroupId,
      status: "efetivada",
    },
  ]);

  if (error) throw error;
  revalidatePath("/");
}

export async function criarConta(input: {
  nome: string;
  tipo: "corrente" | "poupanca" | "carteira" | "investimento";
  saldoInicial: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    nome: input.nome,
    tipo: input.tipo,
    saldo_inicial: input.saldoInicial,
  });
  if (error) throw error;
  revalidatePath("/");
}

export async function criarCartao(input: {
  nome: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: account, error: accError } = await supabase
    .from("accounts")
    .insert({ user_id: user.id, nome: input.nome, tipo: "cartao" })
    .select("id")
    .single();
  if (accError) throw accError;

  const { error: cardError } = await supabase.from("cards").insert({
    user_id: user.id,
    account_id: account.id,
    limite: input.limite,
    dia_fechamento: input.diaFechamento,
    dia_vencimento: input.diaVencimento,
  });
  if (cardError) throw cardError;
  revalidatePath("/");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}
