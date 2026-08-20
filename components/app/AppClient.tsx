"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Shell } from "./Shell";
import { Sheet } from "./Sheet";
import { LancarForm } from "./LancarForm";
import { Icon, PersonArt } from "@/components/icons";
import { fmtBRL, MESES, visualDaCategoria } from "@/lib/util/format";
import { fetchTransacoesDoMes } from "@/lib/data/client-queries";
import type { Account, Card, CategoryTree, Transaction } from "@/lib/types/database";

export function AppClient({
  accounts,
  cards,
  categoryTree,
  initialTransactions,
  initialMonth,
  initialYear,
}: {
  accounts: Account[];
  cards: Card[];
  categoryTree: CategoryTree[];
  initialTransactions: Transaction[];
  initialMonth: number;
  initialYear: number;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [tx, setTx] = useState<Transaction[]>(initialTransactions);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [, startTransition] = useTransition();

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
          <Pill label="Despesas do mês" valor={fmtBRL(totalDespesas)} cor="var(--out)" />
        </div>

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
    pagar: (
      <div className="pt-2">
        <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,0.05),0_14px_34px_rgba(76,60,150,0.09)] p-[22px] text-center">
          <div className="w-[120px] mx-auto mb-2 text-[var(--brand)]">
            <PersonArt className="w-full h-auto" />
          </div>
          <p className="font-bold mt-2">Compromissos e recorrências — em breve</p>
          <p className="text-[12.5px] text-[var(--muted)] max-w-xs mx-auto mt-1">
            Esta área depende de uma próxima etapa do banco (tabela de compromissos). Por enquanto, acompanhe despesas e cartões nas outras abas.
          </p>
        </div>
      </div>
    ),
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
          <MaisLinha icon="importar" titulo="Importar extrato (OFX/CSV)" sub="chega numa próxima etapa" />
          <MaisLinha icon="comprovante" titulo="Comprovantes" sub="foto do cupom e leitura de QR — em breve" />
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
      <Shell mesLabel={mesLabel} onMudarMes={mudarMes} onLancar={() => setSheetOpen(true)} views={views} />
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <LancarForm
          contas={accounts}
          cartoes={cards}
          categoryTree={categoryTree}
          onSalvo={() => {
            setSheetOpen(false);
            recarregarMesAtual();
          }}
        />
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
