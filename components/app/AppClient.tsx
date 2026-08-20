"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "./Shell";
import { Sheet } from "./Sheet";
import { LancarForm } from "./LancarForm";
import { ImportarFaturaForm } from "./ImportarFaturaForm";
import { ImportarExtratoForm } from "./ImportarExtratoForm";
import { ContasCartoesForm } from "./ContasCartoesForm";
import { CategoriasForm } from "./CategoriasForm";
import { ComprovantesForm } from "./ComprovantesForm";
import { Icon, PersonArt } from "@/components/icons";
import { fmtBRL, fmtDataCurta, MESES, visualDaCategoria } from "@/lib/util/format";
import { fetchTransacoesDoMes } from "@/lib/data/client-queries";
import { marcarComoPago } from "@/lib/data/actions";
import { createClient } from "@/lib/supabase/client";
import type { Account, Card, CategoryTree, Transaction, Commitment, Receipt } from "@/lib/types/database";

export function AppClient({
  accounts,
  cards,
  categoryTree,
  initialTransactions,
  initialCommitments,
  initialReceipts,
  initialMonth,
  initialYear,
}: {
  accounts: Account[];
  cards: Card[];
  categoryTree: CategoryTree[];
  initialTransactions: Transaction[];
  initialCommitments: Commitment[];
  initialReceipts: Receipt[];
  initialMonth: number;
  initialYear: number;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [tx, setTx] = useState<Transaction[]>(initialTransactions);
  const [commitments, setCommitments] = useState<Commitment[]>(initialCommitments);
  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetView, setSheetView] = useState<"lancar" | "importarFatura" | "importarExtrato" | "contasCartoes" | "categorias" | "comprovantes">("lancar");
  const [, startTransition] = useTransition();
  const router = useRouter();

  const contaById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const cartaoById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const categoriaById = useMemo(() => {
    const m = new Map<string, { nome: string; parentNome: string | null }>();
    categoryTree.forEach((root) => {
      m.set(root.id, { nome: root.nome, parentNome: null });
      root.subs.forEach((s) => m.set(s.id, { nome: s.nome, parentNome: root.nome }));
    });
    return m;
  }, [categoryTree]);

  function nomeOrigem(t: Transaction) {
    const conta = contaById.get(t.account_id);
    return conta?.nome ?? "—";
  }
  function categoriaRaizNome(t: Transaction) {
    if (!t.category_id) return null;
    const c = categoriaById.get(t.category_id);
    return c?.parentNome ?? c?.nome ?? null;
  }
  function categoriaLabel(t: Transaction) {
    if (!t.category_id) return null;
    const c = categoriaById.get(t.category_id);
    if (!c) return null;
    return c.parentNome ? `${c.parentNome} › ${c.nome}` : c.nome;
  }

  async function mudarMes(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setMonth(m);
    setYear(y);
    const novas = await fetchTransacoesDoMes(m, y);
    setTx(novas);
  }

  function recarregarMesAtual() {
    startTransition(async () => {
      const novas = await fetchTransacoesDoMes(month, year);
      setTx(novas);
    });
  }

  async function recarregarCommitments() {
    const supabase = createClient();
    const { data } = await supabase.from("commitments").select("*").order("data_vencimento", { ascending: true });
    if (data) setCommitments(data as Commitment[]);
  }

  async function recarregarReceipts() {
    const supabase = createClient();
    const { data } = await supabase.from("receipts").select("*").order("created_at", { ascending: false });
    if (data) setReceipts(data as Receipt[]);
  }

  async function pagar(id: string) {
    await marcarComoPago(id);
    await recarregarCommitments();
    startTransition(async () => {
      const novas = await fetchTransacoesDoMes(month, year);
      setTx(novas);
    });
  }

  const isCartaoAccount = (accountId: string) => contaById.get(accountId)?.tipo === "cartao";

  const saldoDisponivel = accounts
    .filter((a) => a.tipo !== "cartao")
    .reduce((acc, a) => acc + a.saldo_inicial, 0)
    + tx.reduce((acc, t) => {
        if (isCartaoAccount(t.account_id)) return acc; // compras de cartão só impactam saldo ao pagar a fatura
        if (t.tipo === "receita") return acc + t.valor;
        if (t.tipo === "despesa") return acc - t.valor;
        if (t.tipo === "transferencia") {
          // saída é sempre a "primeira" perna gravada com contaDe — aqui simplificamos somando pelo par:
          // cada leg de transferência já foi lançado nas duas contas certas, então tratamos como despesa/receita implícita
          return acc; // tratado abaixo via cálculo por conta
        }
        return acc;
      }, 0);

  // Recalcula saldo de forma robusta considerando transferências como pares (saída/entrada já são linhas distintas)
  const saldoReal = useMemo(() => {
    let s = accounts.filter((a) => a.tipo !== "cartao").reduce((acc, a) => acc + a.saldo_inicial, 0);
    for (const t of tx) {
      const conta = contaById.get(t.account_id);
      if (!conta || conta.tipo === "cartao") continue;
      if (t.tipo === "receita") s += t.valor;
      else if (t.tipo === "despesa") s -= t.valor;
      else if (t.tipo === "transferencia") {
        const isSaida = (t.descricao_original ?? "").includes("(saída)");
        s += isSaida ? -t.valor : t.valor;
      }
    }
    return s;
  }, [tx, accounts, contaById]);

  const despesasDoMes = tx.filter((t) => t.tipo === "despesa");
  const totalDespesas = despesasDoMes.reduce((a, t) => a + t.valor, 0);

  const gastosPorCategoria = useMemo(() => {
    const m = new Map<string, number>();
    despesasDoMes.forEach((t) => {
      const nome = categoriaRaizNome(t) ?? "Outros";
      m.set(nome, (m.get(nome) ?? 0) + t.valor);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [despesasDoMes]); // eslint-disable-line react-hooks/exhaustive-deps

  function faturaCartao(cardAccountId: string) {
    return tx
      .filter((t) => t.account_id === cardAccountId && t.tipo === "despesa")
      .reduce((a, t) => a + t.valor, 0);
  }

  const mesLabel = `${MESES[month]} ${year}`;

  const views = {
    inicio: (
      <div className="grid grid-cols-1 md:grid-cols-[1.55fr_1fr] gap-[18px] items-start">
        <div className="md:col-span-2 brand-gradient text-white rounded-[24px] p-[22px] shadow-[0_16px_34px_rgba(76,49,201,0.28)] relative overflow-hidden">
          <div className="absolute -right-11 -top-11 w-[170px] h-[170px] rounded-full" style={{ background: "radial-gradient(circle, #ffffff33, transparent 70%)" }} />
          <div className="text-[13px] text-violet-100/80 font-semibold">Saldo disponível</div>
          <div className="text-[40px] font-extrabold tracking-tight num mt-1 mb-0.5">{fmtBRL(saldoReal)}</div>
          <div className="text-[12.5px] text-violet-200/70">{accounts.filter(a=>a.tipo!=="cartao").map(a=>a.nome).join(" · ") || "Nenhuma conta cadastrada"}</div>
        </div>

        <div className="md:col-span-2 grid grid-cols-2 gap-[10px]">
          <Pill label="Cartões" valor={fmtBRL(cards.reduce((a,c)=>a+faturaCartao(c.account_id),0))} cor="var(--brand)" />
          <Pill label="A pagar" valor={fmtBRL(commitments.filter(k=>k.status==="pendente").reduce((a,k)=>a+k.valor,0))} cor="var(--warn)" />
        </div>

        {commitments.filter(k=>k.status==="pendente").length > 0 && (
          <div>
            <SecH title="Próximos compromissos" right="ver tudo em A pagar" />
            <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)] p-[18px]">
              {commitments.filter(k=>k.status==="pendente").slice(0,3).map((k) => {
                const cat = categoriaById.get(k.category_id ?? "");
                const vis = visualDaCategoria(cat?.parentNome ?? cat?.nome);
                return (
                  <div key={k.id} className="flex items-center gap-3 py-3 px-1 border-b border-[var(--line)] last:border-0">
                    <span className="w-[30px] h-[30px] rounded-[10px] grid place-items-center bg-[var(--surface-2)]" style={{ color: vis.cor }}>
                      <Icon name={vis.icone} className="w-[19px] h-[19px]" />
                    </span>
                    <div className="flex-1">
                      <div className="text-[14.5px] font-semibold">{k.nome}</div>
                      <div className="text-[12px] text-[var(--muted)] mt-0.5">vence {fmtDataCurta(k.data_vencimento)} · <span className="num">{fmtBRL(k.valor)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <SecH title="Onde estou gastando" right={`${fmtBRL(totalDespesas)} no mês`} />
          <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)] p-[18px]">
            {gastosPorCategoria.length ? (
              gastosPorCategoria.map(([nome, valor]) => {
                const vis = visualDaCategoria(nome);
                const pct = Math.round((valor / (totalDespesas || 1)) * 100);
                return (
                  <div key={nome} className="py-[11px] px-1 border-b border-[var(--line)] last:border-0">
                    <div className="flex justify-between text-[14px] mb-[7px]">
                      <span className="font-semibold flex items-center gap-2">
                        <span className="w-[30px] h-[30px] rounded-[10px] grid place-items-center bg-[var(--surface-2)]" style={{ color: vis.cor }}>
                          <Icon name={vis.icone} className="w-[19px] h-[19px]" />
                        </span>
                        {nome}
                      </span>
                      <span className="num">{fmtBRL(valor)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: vis.cor }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState titulo="Sem gastos neste mês" sub="Toque em Lançar para começar" />
            )}
          </div>
        </div>

        <div>
          <SecH title="Movimentações" right={`${tx.length} no mês`} />
          <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)] p-[18px]">
            {tx.length ? (
              tx.slice(0, 8).map((t) => <TxRow key={t.id} t={t} nomeOrigem={nomeOrigem(t)} label={categoriaLabel(t)} />)
            ) : (
              <EmptyState titulo="Nenhuma movimentação" sub="Lance sua primeira despesa ou receita" />
            )}
          </div>
        </div>
      </div>
    ),
    pagar: (() => {
      const HOJE = new Date();
      const pend = commitments.filter((k) => k.status === "pendente");
      const grupos: { venc: Commitment[]; hoje: Commitment[]; sete: Commitment[]; trinta: Commitment[]; depois: Commitment[] } = {
        venc: [], hoje: [], sete: [], trinta: [], depois: [],
      };
      pend.forEach((k) => {
        const dias = Math.round((new Date(k.data_vencimento + "T12:00:00").getTime() - HOJE.getTime()) / 86400000);
        if (dias < 0) grupos.venc.push(k);
        else if (dias === 0) grupos.hoje.push(k);
        else if (dias <= 7) grupos.sete.push(k);
        else if (dias <= 30) grupos.trinta.push(k);
        else grupos.depois.push(k);
      });
      const aPagar = pend.reduce((a, k) => a + k.valor, 0);
      const vencido = pend.filter((k) => new Date(k.data_vencimento + "T12:00:00") < HOJE).reduce((a, k) => a + k.valor, 0);
      const pago = commitments.filter((k) => k.status === "pago").reduce((a, k) => a + k.valor, 0);

      const kRow = (k: Commitment) => {
        const venc = new Date(k.data_vencimento + "T12:00:00") < HOJE && k.status === "pendente";
        const cat = categoriaById.get(k.category_id ?? "");
        const vis = visualDaCategoria(cat?.parentNome ?? cat?.nome);
        return (
          <div key={k.id} className="flex items-center gap-3 py-3 px-1 border-b border-[var(--line)] last:border-0">
            <span className="w-[30px] h-[30px] rounded-[10px] grid place-items-center bg-[var(--surface-2)]" style={{ color: vis.cor }}>
              <Icon name={vis.icone} className="w-[19px] h-[19px]" />
            </span>
            <div className="flex-1">
              <div className="text-[14.5px] font-semibold">{k.nome}</div>
              <div className={`text-[12px] mt-0.5 ${venc ? "text-[var(--out)] font-semibold" : "text-[var(--muted)]"}`}>
                {venc ? "venceu " : "vence "}{fmtDataCurta(k.data_vencimento)} · <span className="num">{fmtBRL(k.valor)}</span>
              </div>
            </div>
            <button onClick={() => pagar(k.id)} className="border border-[var(--brand)] text-[var(--brand)] text-[12.5px] font-bold px-3 py-2 rounded-[11px]">Pagar</button>
          </div>
        );
      };
      const grupo = (label: string, arr: Commitment[], destaque?: boolean) =>
        arr.length ? (
          <div key={label}>
            <div className={`text-[12px] font-extrabold uppercase tracking-wide mt-4 mb-1.5 mx-1 ${destaque ? "text-[var(--out)]" : "text-[var(--muted)]"}`}>{label}</div>
            <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)] p-[18px]">
              {arr.map(kRow)}
            </div>
          </div>
        ) : null;

      return (
        <div className="pt-2">
          <div className="grid grid-cols-3 gap-2.5 mb-1.5">
            <div className="bg-white rounded-2xl p-3 text-center shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)]">
              <div className="text-[11px] text-[var(--muted)] font-semibold">A pagar</div>
              <div className="text-[16px] font-extrabold mt-1 num" style={{ color: "var(--warn)" }}>{fmtBRL(aPagar)}</div>
            </div>
            <div className="bg-white rounded-2xl p-3 text-center shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)]">
              <div className="text-[11px] text-[var(--muted)] font-semibold">Vencido</div>
              <div className="text-[16px] font-extrabold mt-1 num text-[var(--out)]">{fmtBRL(vencido)}</div>
            </div>
            <div className="bg-white rounded-2xl p-3 text-center shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)]">
              <div className="text-[11px] text-[var(--muted)] font-semibold">Pago</div>
              <div className="text-[16px] font-extrabold mt-1 num text-[var(--in)]">{fmtBRL(pago)}</div>
            </div>
          </div>
          {grupo("Vencidas", grupos.venc, true)}
          {grupo("Hoje", grupos.hoje)}
          {grupo("Próximos 7 dias", grupos.sete)}
          {grupo("Próximos 30 dias", grupos.trinta)}
          {grupo("Depois", grupos.depois)}
          {pend.length === 0 && (
            <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)] p-[18px] mt-2">
              <EmptyState titulo="Nada a pagar por aqui" sub="Importe uma fatura ou lance um compromisso" />
            </div>
          )}
        </div>
      );
    })(),
    cartoes: (
      <div className="pt-2 flex flex-col gap-4">
        {cards.length === 0 && (
          <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)] p-[18px]">
            <EmptyState titulo="Nenhum cartão cadastrado" sub="Cadastre um cartão para ver a fatura aqui" />
          </div>
        )}
        {cards.map((c) => {
          const conta = contaById.get(c.account_id);
          const fat = faturaCartao(c.account_id);
          const usoPct = c.limite > 0 ? Math.min(100, Math.round((fat / c.limite) * 100)) : 0;
          return (
            <div key={c.id}>
              <div className="brand-gradient text-white rounded-[18px] p-[18px] shadow-[0_14px_30px_rgba(76,49,201,0.26)] mb-3.5">
                <div className="text-[13px] text-violet-200/80 font-semibold">{conta?.nome}</div>
                <div className="text-[30px] font-extrabold num mt-1.5 mb-0.5 tracking-tight">{fmtBRL(fat)}</div>
                <div className="flex justify-between text-[12px] text-violet-200/70 mt-2.5">
                  <span>Fatura atual</span>
                  <span>fecha dia {c.dia_fechamento ?? "—"} · vence dia {c.dia_vencimento ?? "—"}</span>
                </div>
                {c.limite > 0 && (
                  <>
                    <div className="h-[9px] rounded-full bg-white/20 overflow-hidden mt-3">
                      <div className="h-full rounded-full bg-white" style={{ width: `${usoPct}%` }} />
                    </div>
                    <div className="flex justify-between text-[11.5px] text-violet-200/70 mt-1.5">
                      <span>Usado {fmtBRL(fat)}</span>
                      <span>Disponível {fmtBRL(Math.max(0, c.limite - fat))}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    ),
    mais: (
      <div className="pt-2">
        <SecH title="Trazer dados pra dentro" />
        <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)] p-[18px] mb-5">
          <button onClick={() => { setSheetView("importarExtrato"); setSheetOpen(true); }} className="w-full text-left">
            <MaisLinhaAtivo icon="importar" titulo="Importar extrato (OFX/CSV)" sub="com conferência antes de salvar" />
          </button>
          <button onClick={() => { setSheetView("importarFatura"); setSheetOpen(true); }} className="w-full text-left">
            <MaisLinhaAtivo icon="banco" titulo="Importar fatura (Energia ou Água)" sub="PDF ou foto do código de barras" />
          </button>
          <button onClick={() => { setSheetView("comprovantes"); setSheetOpen(true); }} className="w-full text-left">
            <MaisLinhaAtivo icon="comprovante" titulo="Comprovantes" sub={`${receipts.length} salvos · foto do cupom ou nota`} />
          </button>
        </div>

        <SecH title="Organizar" />
        <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)] p-[18px] mb-5">
          <button onClick={() => { setSheetView("contasCartoes"); setSheetOpen(true); }} className="w-full text-left">
            <MaisLinhaAtivo icon="banco" titulo="Contas e cartões" sub={`${accounts.filter(a=>a.tipo!=="cartao").length} contas · ${cards.length} cartões`} />
          </button>
          <button onClick={() => { setSheetView("categorias"); setSheetOpen(true); }} className="w-full text-left">
            <MaisLinhaAtivo icon="financeiro" titulo="Categorias" sub={`${categoryTree.length} categorias`} />
          </button>
        </div>

        <SecH title="Minhas contas" />
        <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)] p-[18px] mb-5">
          {accounts.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-[13px] px-1 border-b border-[var(--line)] last:border-0">
              <span className="w-[30px] h-[30px] rounded-[10px] grid place-items-center bg-[var(--surface-2)] text-[var(--brand)]">
                <Icon name={c.tipo === "carteira" ? "carteira" : c.tipo === "cartao" ? "cartoes" : "banco"} className="w-[19px] h-[19px]" />
              </span>
              <div className="flex-1">
                <div className="text-[14.5px] font-semibold">{c.nome}</div>
                <div className="text-[12px] text-[var(--muted)] capitalize">{c.tipo}</div>
              </div>
            </div>
          ))}
        </div>

        <SecH title={`Todas as movimentações · ${tx.length}`} />
        <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)] p-[18px]">
          {tx.length ? tx.map((t) => <TxRow key={t.id} t={t} nomeOrigem={nomeOrigem(t)} label={categoriaLabel(t)} />) : (
            <EmptyState titulo="Nada por aqui ainda" sub="Suas movimentações aparecem aqui" />
          )}
        </div>
      </div>
    ),
  };

  return (
    <>
      <Shell mesLabel={mesLabel} onMudarMes={mudarMes} onLancar={() => { setSheetView("lancar"); setSheetOpen(true); }} views={views} />
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        {sheetView === "lancar" && (
          <LancarForm
            contas={accounts}
            cartoes={cards}
            categoryTree={categoryTree}
            onSalvo={() => {
              setSheetOpen(false);
              recarregarMesAtual();
            }}
          />
        )}
        {sheetView === "importarFatura" && (
          <ImportarFaturaForm
            onSalvo={() => {
              setSheetOpen(false);
              recarregarCommitments();
            }}
          />
        )}
        {sheetView === "importarExtrato" && (
          <ImportarExtratoForm
            contas={accounts}
            onSalvo={() => {
              setSheetOpen(false);
              recarregarMesAtual();
            }}
          />
        )}
        {sheetView === "contasCartoes" && (
          <ContasCartoesForm
            contas={accounts}
            cartoes={cards}
            onSalvo={() => router.refresh()}
          />
        )}
        {sheetView === "categorias" && (
          <CategoriasForm
            categoryTree={categoryTree}
            onSalvo={() => router.refresh()}
          />
        )}
        {sheetView === "comprovantes" && (
          <ComprovantesForm
            transacoes={tx}
            receipts={receipts}
            onSalvo={recarregarReceipts}
          />
        )}
      </Sheet>
    </>
  );
}

function Pill({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)]">
      <div className="text-[11.5px] text-[var(--muted)] font-semibold flex items-center gap-1.5">
        <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: cor }} />
        {label}
      </div>
      <div className="text-[16.5px] font-extrabold mt-1.5 num" style={{ color: cor }}>{valor}</div>
    </div>
  );
}

function SecH({ title, right }: { title: string; right?: string }) {
  return (
    <div className="flex items-baseline justify-between mx-1 mb-2.5">
      <h2 className="text-[15px] font-extrabold tracking-tight">{title}</h2>
      {right && <span className="text-[12px] text-[var(--muted)]">{right}</span>}
    </div>
  );
}

function EmptyState({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div className="text-center text-[var(--muted)] py-6 px-5">
      <div className="w-[100px] mx-auto mb-1.5 text-[var(--brand)]">
        <PersonArt className="w-full h-auto" />
      </div>
      <p className="font-bold text-[var(--ink)] mt-2 mb-0.5">{titulo}</p>
      <small className="text-[12.5px]">{sub}</small>
    </div>
  );
}

function MaisLinha({ icon, titulo, sub }: { icon: string; titulo: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 py-[13px] px-1 border-b border-[var(--line)] last:border-0 opacity-90">
      <span className="w-[30px] h-[30px] rounded-[10px] grid place-items-center bg-[var(--surface-2)] text-[var(--brand)]">
        <Icon name={icon} className="w-[19px] h-[19px]" />
      </span>
      <div className="flex-1">
        <div className="text-[14.5px] font-semibold">{titulo}</div>
        <div className="text-[12px] text-[var(--muted)]">{sub}</div>
      </div>
      <Icon name="chev" className="w-[18px] h-[18px] text-[var(--muted)]" />
    </div>
  );
}

function MaisLinhaAtivo({ icon, titulo, sub }: { icon: string; titulo: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 py-[13px] px-1 border-b border-[var(--line)] last:border-0">
      <span className="w-[30px] h-[30px] rounded-[10px] grid place-items-center bg-[var(--brand-soft)] text-[var(--brand)]">
        <Icon name={icon} className="w-[19px] h-[19px]" />
      </span>
      <div className="flex-1">
        <div className="text-[14.5px] font-semibold">{titulo}</div>
        <div className="text-[12px] text-[var(--muted)]">{sub}</div>
      </div>
      <Icon name="chev" className="w-[18px] h-[18px] text-[var(--brand)]" />
    </div>
  );
}

function TxRow({ t, nomeOrigem, label }: { t: Transaction; nomeOrigem: string; label: string | null }) {
  if (t.tipo === "transferencia") {
    const isSaida = (t.descricao_original ?? "").includes("(saída)");
    return (
      <div className="flex items-center gap-3 py-3 px-1 border-b border-[var(--line)] last:border-0">
        <span className="w-[30px] h-[30px] rounded-[10px] grid place-items-center bg-[var(--surface-2)] text-[var(--muted)]">
          <Icon name="transferencia" className="w-[19px] h-[19px]" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-semibold">Transferência interna</div>
          <div className="text-[12px] text-[var(--muted)] mt-0.5">{isSaida ? "saída" : "entrada"} · {nomeOrigem}</div>
        </div>
        <div className="text-[15px] font-extrabold num text-[var(--muted)]">{fmtBRL(t.valor)}</div>
      </div>
    );
  }

  const isIn = t.tipo === "receita";
  const vis = visualDaCategoria(label?.split(" › ")[0]);

  return (
    <div className="flex items-center gap-3 py-3 px-1 border-b border-[var(--line)] last:border-0">
      <span className="w-[30px] h-[30px] rounded-[10px] grid place-items-center bg-[var(--surface-2)]" style={{ color: vis.cor }}>
        <Icon name={vis.icone} className="w-[19px] h-[19px]" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-semibold truncate">{t.descricao_original}</div>
        <div className="text-[12px] text-[var(--muted)] mt-0.5 flex gap-1.5 items-center flex-wrap">
          {label && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">{label}</span>}
          <span className="text-[11px] bg-[var(--surface-2)] rounded-full px-2 py-0.5">{nomeOrigem}</span>
        </div>
      </div>
      <div className={`text-[15px] font-extrabold num ${isIn ? "text-[var(--in)]" : "text-[var(--out)]"}`}>
        {isIn ? "+" : "−"} {fmtBRL(t.valor)}
      </div>
    </div>
  );
}
