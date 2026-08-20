"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { normalizar } from "@/lib/util/normalizar";

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

/* ===================== Importação de extrato (OFX/CSV) ===================== */

export interface TransacaoClassificada {
  data: string;
  valor: number;
  tipo: "receita" | "despesa";
  descricao: string;
  dedupKey: string;
  classificacao: "nova" | "existente";
}

/** Recebe as transações já parseadas (client-side) e classifica novas x já existentes, sem gravar nada ainda. */
export async function analisarExtrato(
  accountId: string,
  transacoes: { data: string; valor: number; tipo: "receita" | "despesa"; descricao: string; fitid: string | null }[]
): Promise<TransacaoClassificada[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  // Numera as ocorrências repetidas (mesma data+valor+descrição) pela ORDEM em que aparecem
  // no próprio arquivo — não por contagem no banco. Como o banco sempre exporta as transações
  // de um dia na mesma ordem, a mesma transação cai no mesmo número de ordem em qualquer
  // arquivo que a contenha, mesmo em janelas de datas sobrepostas.
  const ordinalNoArquivo = new Map<string, number>();
  const dedupKeys: string[] = transacoes.map((t) => {
    if (t.fitid) return `extrato:ofx:${accountId}:${t.fitid}`;
    const chave = `${t.data}|${t.valor.toFixed(2)}|${normalizar(t.descricao)}`;
    const usados = ordinalNoArquivo.get(chave) ?? 0;
    ordinalNoArquivo.set(chave, usados + 1);
    return `extrato:csv:${accountId}:${chave}:${usados + 1}`;
  });

  const { data: existentesNoBanco } = await supabase
    .from("transactions")
    .select("dedup_key")
    .eq("account_id", accountId)
    .in("dedup_key", dedupKeys);
  const setExistentes = new Set((existentesNoBanco ?? []).map((r) => r.dedup_key));

  return transacoes.map((t, i) => ({
    ...t,
    dedupKey: dedupKeys[i],
    classificacao: setExistentes.has(dedupKeys[i]) ? "existente" as const : "nova" as const,
  }));
}

/** Grava efetivamente as transações marcadas como novas. */
export async function confirmarImportacaoExtrato(
  accountId: string,
  transacoes: TransacaoClassificada[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: source } = await supabase
    .from("sources")
    .select("id")
    .eq("tipo", "arquivo")
    .limit(1)
    .maybeSingle();

  let sourceId = source?.id ?? null;
  if (!sourceId) {
    const { data: novaSource } = await supabase
      .from("sources")
      .insert({ user_id: user.id, tipo: "arquivo", descricao: "Importação de extrato" })
      .select("id")
      .single();
    sourceId = novaSource?.id ?? null;
  }

  const novas = transacoes.filter((t) => t.classificacao === "nova");
  if (novas.length === 0) return { inseridas: 0 };

  const linhas = novas.map((t) => ({
    user_id: user.id,
    account_id: accountId,
    data: t.data,
    valor: t.valor,
    tipo: t.tipo,
    descricao_original: t.descricao,
    descricao_normalizada: normalizar(t.descricao),
    dedup_key: t.dedupKey,
    source_id: sourceId,
    status: "efetivada" as const,
  }));

  const { error } = await supabase.from("transactions").upsert(linhas, {
    onConflict: "user_id,account_id,dedup_key",
    ignoreDuplicates: true,
  });
  if (error) throw error;

  revalidatePath("/");
  return { inseridas: novas.length };
}

/* ===================== Compromissos (A Pagar) ===================== */

export async function marcarComoPago(commitmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: k, error: fetchErr } = await supabase
    .from("commitments")
    .select("*")
    .eq("id", commitmentId)
    .single();
  if (fetchErr || !k) throw new Error("Compromisso não encontrado.");

  // conta padrão (a primeira conta corrente ativa) para registrar a despesa
  const { data: conta } = await supabase
    .from("accounts")
    .select("id")
    .neq("tipo", "cartao")
    .limit(1)
    .maybeSingle();

  const { data: source } = await supabase
    .from("sources")
    .select("id")
    .eq("tipo", "manual")
    .limit(1)
    .maybeSingle();

  let matchedTxId: string | null = null;
  if (conta) {
    const { data: tx } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        account_id: conta.id,
        data: new Date().toISOString().slice(0, 10),
        valor: k.valor,
        tipo: "despesa",
        descricao_original: k.nome,
        descricao_normalizada: k.nome.toUpperCase(),
        category_id: k.category_id,
        source_id: source?.id ?? null,
        dedup_key: `pagamento-compromisso:${k.id}:${randomUUID().slice(0, 8)}`,
        status: "efetivada",
      })
      .select("id")
      .single();
    matchedTxId = tx?.id ?? null;
  }

  const { error } = await supabase
    .from("commitments")
    .update({ status: "pago", matched_transaction_id: matchedTxId })
    .eq("id", commitmentId);
  if (error) throw error;
  revalidatePath("/");
}

/** Cria ou atualiza (por dedup_key) um compromisso a partir de uma fatura importada. */
export async function importarCompromissoFatura(input: {
  nome: string;
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  referencia: string | null;
  categoriaNome: string; // ex.: "Energia" — busca a subcategoria dentro de Casa
  dedupKey: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("nome", input.categoriaNome)
    .limit(1)
    .maybeSingle();

  const { data: source } = await supabase
    .from("sources")
    .select("id")
    .eq("tipo", "consumo")
    .limit(1)
    .maybeSingle();

  let sourceId = source?.id ?? null;
  if (!sourceId) {
    const { data: novaSource } = await supabase
      .from("sources")
      .insert({ user_id: user.id, tipo: "consumo", descricao: "Fatura importada" })
      .select("id")
      .single();
    sourceId = novaSource?.id ?? null;
  }

  const { error } = await supabase.from("commitments").upsert(
    {
      user_id: user.id,
      nome: input.nome,
      category_id: cat?.id ?? null,
      valor: input.valor,
      data_vencimento: input.dataVencimento,
      referencia: input.referencia,
      source_id: sourceId,
      status: "pendente",
      dedup_key: input.dedupKey,
    },
    { onConflict: "user_id,dedup_key" }
  );
  if (error) throw error;
  revalidatePath("/");
}

/* ===================== Contas e Cartões (gestão) ===================== */

export async function excluirConta(accountId: string) {
  const supabase = await createClient();
  // soft delete — mantém o histórico de transações intacto
  const { error } = await supabase.from("accounts").update({ ativo: false }).eq("id", accountId);
  if (error) throw error;
  revalidatePath("/");
}

export async function editarCartao(input: {
  accountId: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cards")
    .update({ limite: input.limite, dia_fechamento: input.diaFechamento, dia_vencimento: input.diaVencimento })
    .eq("account_id", input.accountId);
  if (error) throw error;
  revalidatePath("/");
}

/* ===================== Categorias (gestão) ===================== */

export async function criarCategoria(input: { nome: string; cor?: string; icone?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    nome: input.nome,
    cor: input.cor ?? null,
    icone: input.icone ?? "default",
    is_sistema: false,
  });
  if (error) throw error;
  revalidatePath("/");
}

export async function criarSubcategoria(input: { nome: string; parentId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    nome: input.nome,
    parent_id: input.parentId,
    is_sistema: false,
  });
  if (error) throw error;
  revalidatePath("/");
}

/** Só permite excluir categorias criadas pelo usuário — as de fábrica (is_sistema) ficam protegidas. */
export async function excluirCategoria(categoryId: string) {
  const supabase = await createClient();
  const { data: cat } = await supabase.from("categories").select("is_sistema").eq("id", categoryId).single();
  if (cat?.is_sistema) throw new Error("Essa categoria vem de fábrica e não pode ser excluída.");

  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) throw error;
  revalidatePath("/");
}

/* ===================== Comprovantes ===================== */

export async function criarComprovante(input: {
  storagePath: string;
  transactionId: string | null;
  valor: number | null;
  data: string | null;
  estabelecimento: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { error } = await supabase.from("receipts").insert({
    user_id: user.id,
    storage_path: input.storagePath,
    transaction_id: input.transactionId,
    valor: input.valor,
    data: input.data,
    estabelecimento: input.estabelecimento,
  });
  if (error) throw error;
  revalidatePath("/");
}

export async function excluirComprovante(receiptId: string, storagePath: string) {
  const supabase = await createClient();
  await supabase.storage.from("comprovantes").remove([storagePath]);
  const { error } = await supabase.from("receipts").delete().eq("id", receiptId);
  if (error) throw error;
  revalidatePath("/");
}
