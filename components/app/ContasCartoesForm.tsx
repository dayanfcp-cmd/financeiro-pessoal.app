"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { criarConta, criarCartao, excluirConta } from "@/lib/data/actions";
import type { Account, Card, AccountType } from "@/lib/types/database";

const TIPOS: { value: Exclude<AccountType, "cartao">; label: string }[] = [
  { value: "corrente", label: "Conta corrente" },
  { value: "poupanca", label: "Poupança" },
  { value: "carteira", label: "Carteira" },
  { value: "investimento", label: "Investimento" },
];

export function ContasCartoesForm({
  contas,
  cartoes,
  onSalvo,
}: {
  contas: Account[];
  cartoes: Card[];
  onSalvo: () => void;
}) {
  const [aba, setAba] = useState<"contas" | "cartoes">("contas");

  return (
    <div>
      <h3 className="text-[18px] font-extrabold mt-0.5 mb-4">Contas e cartões</h3>

      <div className="flex bg-[var(--surface-2)] rounded-[13px] p-1 gap-1 mb-4">
        <button
          type="button"
          onClick={() => setAba("contas")}
          className={`flex-1 py-2.5 rounded-[10px] text-[13.5px] font-bold transition ${aba === "contas" ? "bg-white shadow text-[var(--ink)]" : "text-[var(--muted)]"}`}
        >
          Contas
        </button>
        <button
          type="button"
          onClick={() => setAba("cartoes")}
          className={`flex-1 py-2.5 rounded-[10px] text-[13.5px] font-bold transition ${aba === "cartoes" ? "bg-white shadow text-[var(--ink)]" : "text-[var(--muted)]"}`}
        >
          Cartões
        </button>
      </div>

      {aba === "contas" ? <ListaContas contas={contas} onSalvo={onSalvo} /> : <ListaCartoes contas={contas} cartoes={cartoes} onSalvo={onSalvo} />}
    </div>
  );
}

function ListaContas({ contas, onSalvo }: { contas: Account[]; onSalvo: () => void }) {
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<Exclude<AccountType, "cartao">>("corrente");
  const [saldo, setSaldo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) { setErro("Dê um nome para a conta."); return; }
    setSalvando(true);
    setErro(null);
    try {
      const saldoNum = parseFloat(saldo.replace(/\./g, "").replace(",", ".")) || 0;
      await criarConta({ nome: nome.trim(), tipo, saldoInicial: saldoNum });
      setNome(""); setSaldo(""); setCriando(false);
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    await excluirConta(id);
    onSalvo();
  }

  return (
    <div>
      <div className="bg-white border border-[var(--line)] rounded-2xl mb-3.5 overflow-hidden">
        {contas.filter((c) => c.tipo !== "cartao").map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--line)] last:border-0">
            <span className="w-[30px] h-[30px] rounded-[10px] grid place-items-center bg-[var(--surface-2)] text-[var(--brand)]">
              <Icon name={c.tipo === "carteira" ? "carteira" : "banco"} className="w-[18px] h-[18px]" />
            </span>
            <div className="flex-1">
              <div className="text-[14.5px] font-semibold">{c.nome}</div>
              <div className="text-[12px] text-[var(--muted)] capitalize">{c.tipo}</div>
            </div>
            <button onClick={() => remover(c.id)} className="text-[12px] text-[var(--out)] font-semibold px-2 py-1">Remover</button>
          </div>
        ))}
        {contas.filter((c) => c.tipo !== "cartao").length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] text-[var(--muted)]">Nenhuma conta cadastrada ainda.</div>
        )}
      </div>

      {!criando ? (
        <button onClick={() => setCriando(true)} className="w-full py-3 rounded-2xl font-bold text-[14px] border border-dashed border-[var(--line)] text-[var(--brand)]">
          + Nova conta
        </button>
      ) : (
        <div className="bg-white border border-[var(--line)] rounded-2xl p-4">
          <label className="block mb-3">
            <span className="block text-[12px] font-bold text-[var(--muted)] mb-1.5">Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Itaú, Nubank" className="w-full border border-[var(--line)] rounded-xl px-3 py-2.5 text-[14.5px] outline-none" />
          </label>
          <label className="block mb-3">
            <span className="block text-[12px] font-bold text-[var(--muted)] mb-1.5">Tipo</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as Exclude<AccountType, "cartao">)} className="w-full border border-[var(--line)] rounded-xl px-3 py-2.5 text-[14.5px] outline-none">
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="block mb-3">
            <span className="block text-[12px] font-bold text-[var(--muted)] mb-1.5">Saldo atual</span>
            <input value={saldo} onChange={(e) => setSaldo(e.target.value)} inputMode="decimal" placeholder="0,00" className="w-full border border-[var(--line)] rounded-xl px-3 py-2.5 text-[14.5px] outline-none" />
          </label>
          {erro && <div className="text-[#B23B36] text-[13px] mb-3">{erro}</div>}
          <div className="flex gap-2">
            <button onClick={() => { setCriando(false); setErro(null); }} className="flex-1 py-2.5 rounded-xl font-bold text-[13.5px] bg-white border border-[var(--line)]">Cancelar</button>
            <button onClick={salvar} disabled={salvando} className="flex-1 py-2.5 rounded-xl font-bold text-[13.5px] bg-[var(--brand)] text-white disabled:opacity-60">{salvando ? "Salvando..." : "Salvar"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ListaCartoes({ contas, cartoes, onSalvo }: { contas: Account[]; cartoes: Card[]; onSalvo: () => void }) {
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [limite, setLimite] = useState("");
  const [fechamento, setFechamento] = useState("20");
  const [vencimento, setVencimento] = useState("28");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) { setErro("Dê um nome para o cartão."); return; }
    setSalvando(true);
    setErro(null);
    try {
      await criarCartao({
        nome: nome.trim(),
        limite: parseFloat(limite.replace(/\./g, "").replace(",", ".")) || 0,
        diaFechamento: parseInt(fechamento, 10) || 20,
        diaVencimento: parseInt(vencimento, 10) || 28,
      });
      setNome(""); setLimite(""); setCriando(false);
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(accountId: string) {
    await excluirConta(accountId);
    onSalvo();
  }

  const contaById = new Map(contas.map((c) => [c.id, c]));

  return (
    <div>
      <div className="bg-white border border-[var(--line)] rounded-2xl mb-3.5 overflow-hidden">
        {cartoes.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--line)] last:border-0">
            <span className="w-[30px] h-[30px] rounded-[10px] grid place-items-center bg-[var(--surface-2)] text-[var(--brand)]">
              <Icon name="cartoes" className="w-[18px] h-[18px]" />
            </span>
            <div className="flex-1">
              <div className="text-[14.5px] font-semibold">{contaById.get(c.account_id)?.nome}</div>
              <div className="text-[12px] text-[var(--muted)]">limite {c.limite?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · fecha {c.dia_fechamento} · vence {c.dia_vencimento}</div>
            </div>
            <button onClick={() => remover(c.account_id)} className="text-[12px] text-[var(--out)] font-semibold px-2 py-1">Remover</button>
          </div>
        ))}
        {cartoes.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] text-[var(--muted)]">Nenhum cartão cadastrado ainda.</div>
        )}
      </div>

      {!criando ? (
        <button onClick={() => setCriando(true)} className="w-full py-3 rounded-2xl font-bold text-[14px] border border-dashed border-[var(--line)] text-[var(--brand)]">
          + Novo cartão
        </button>
      ) : (
        <div className="bg-white border border-[var(--line)] rounded-2xl p-4">
          <label className="block mb-3">
            <span className="block text-[12px] font-bold text-[var(--muted)] mb-1.5">Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Itaú Visa" className="w-full border border-[var(--line)] rounded-xl px-3 py-2.5 text-[14.5px] outline-none" />
          </label>
          <label className="block mb-3">
            <span className="block text-[12px] font-bold text-[var(--muted)] mb-1.5">Limite</span>
            <input value={limite} onChange={(e) => setLimite(e.target.value)} inputMode="decimal" placeholder="0,00" className="w-full border border-[var(--line)] rounded-xl px-3 py-2.5 text-[14.5px] outline-none" />
          </label>
          <div className="flex gap-2.5 mb-3">
            <label className="flex-1 block">
              <span className="block text-[12px] font-bold text-[var(--muted)] mb-1.5">Dia fechamento</span>
              <input value={fechamento} onChange={(e) => setFechamento(e.target.value)} inputMode="numeric" className="w-full border border-[var(--line)] rounded-xl px-3 py-2.5 text-[14.5px] outline-none" />
            </label>
            <label className="flex-1 block">
              <span className="block text-[12px] font-bold text-[var(--muted)] mb-1.5">Dia vencimento</span>
              <input value={vencimento} onChange={(e) => setVencimento(e.target.value)} inputMode="numeric" className="w-full border border-[var(--line)] rounded-xl px-3 py-2.5 text-[14.5px] outline-none" />
            </label>
          </div>
          {erro && <div className="text-[#B23B36] text-[13px] mb-3">{erro}</div>}
          <div className="flex gap-2">
            <button onClick={() => { setCriando(false); setErro(null); }} className="flex-1 py-2.5 rounded-xl font-bold text-[13.5px] bg-white border border-[var(--line)]">Cancelar</button>
            <button onClick={salvar} disabled={salvando} className="flex-1 py-2.5 rounded-xl font-bold text-[13.5px] bg-[var(--brand)] text-white disabled:opacity-60">{salvando ? "Salvando..." : "Salvar"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
