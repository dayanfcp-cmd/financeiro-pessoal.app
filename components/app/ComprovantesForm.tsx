"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { criarComprovante, excluirComprovante } from "@/lib/data/actions";
import { fmtBRL, fmtDataCurta } from "@/lib/util/format";
import type { Transaction, Receipt } from "@/lib/types/database";

export function ComprovantesForm({
  transacoes,
  receipts,
  onSalvo,
}: {
  transacoes: Transaction[];
  receipts: Receipt[];
  onSalvo: () => void;
}) {
  const [modo, setModo] = useState<"galeria" | "novo">("galeria");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[18px] font-extrabold mt-0.5">Comprovantes</h3>
        {modo === "galeria" && (
          <button onClick={() => setModo("novo")} className="text-[13px] font-bold text-[var(--brand)]">+ Adicionar</button>
        )}
      </div>

      {modo === "galeria" ? (
        <Galeria receipts={receipts} transacoes={transacoes} onVoltar={() => setModo("galeria")} onSalvo={onSalvo} />
      ) : (
        <NovoComprovante transacoes={transacoes} onCancelar={() => setModo("galeria")} onSalvo={() => { setModo("galeria"); onSalvo(); }} />
      )}
    </div>
  );
}

function Galeria({
  receipts,
  transacoes,
  onSalvo,
}: {
  receipts: Receipt[];
  transacoes: Transaction[];
  onVoltar: () => void;
  onSalvo: () => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const txById = new Map(transacoes.map((t) => [t.id, t]));

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const entradas = await Promise.all(
        receipts.map(async (r) => {
          const { data } = await supabase.storage.from("comprovantes").createSignedUrl(r.storage_path, 3600);
          return [r.id, data?.signedUrl ?? ""] as const;
        })
      );
      setUrls(Object.fromEntries(entradas));
    })();
  }, [receipts]);

  async function remover(r: Receipt) {
    await excluirComprovante(r.id, r.storage_path);
    onSalvo();
  }

  if (receipts.length === 0) {
    return <div className="text-center py-8 text-[13px] text-[var(--muted)]">Nenhum comprovante salvo ainda.</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {receipts.map((r) => {
        const tx = r.transaction_id ? txById.get(r.transaction_id) : null;
        const isPdf = /\.pdf$/i.test(r.storage_path);
        return (
          <div key={r.id} className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
            <div className="aspect-square bg-[var(--surface-2)] grid place-items-center">
              {isPdf ? (
                <Icon name="comprovante" className="w-8 h-8 text-[var(--muted)]" />
              ) : urls[r.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[r.id]} alt="Comprovante" className="w-full h-full object-cover" />
              ) : (
                <div className="w-6 h-6 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <div className="p-2.5">
              <div className="text-[12.5px] font-semibold truncate">{tx?.descricao_original ?? "Sem transação vinculada"}</div>
              {tx && <div className="text-[11px] text-[var(--muted)]">{fmtDataCurta(tx.data)} · {fmtBRL(tx.valor)}</div>}
              <button onClick={() => remover(r)} className="text-[11px] text-[var(--out)] font-semibold mt-1">Excluir</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NovoComprovante({
  transacoes,
  onCancelar,
  onSalvo,
}: {
  transacoes: Transaction[];
  onCancelar: () => void;
  onSalvo: () => void;
}) {
  const [transactionId, setTransactionId] = useState<string>("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    setEnviando(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("comprovantes").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      await criarComprovante({
        storagePath: path,
        transactionId: transactionId || null,
        valor: null,
        data: null,
        estabelecimento: null,
      });
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar o comprovante.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <label className="block mb-4">
        <span className="block text-[12.5px] font-bold text-[var(--muted)] mb-1.5">Vincular a qual movimentação? (opcional)</span>
        <select value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="w-full border border-[var(--line)] rounded-xl px-3.5 py-3 text-[14px] outline-none">
          <option value="">Sem vínculo — só guardar o comprovante</option>
          {transacoes.slice(0, 30).map((t) => (
            <option key={t.id} value={t.id}>{fmtDataCurta(t.data)} · {t.descricao_original} · {fmtBRL(t.valor)}</option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={enviando}
        className="w-full border-2 border-dashed border-[var(--line)] rounded-2xl py-10 flex flex-col items-center gap-2 text-[var(--muted)] disabled:opacity-60"
      >
        <Icon name="comprovante" className="w-8 h-8 text-[var(--brand)]" />
        <span className="font-semibold text-[var(--ink)]">{enviando ? "Enviando..." : "Tirar foto ou escolher arquivo"}</span>
        <span className="text-[12px]">cupom, nota fiscal ou comprovante</span>
      </button>
      <input ref={fileInput} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={onFile} />

      {erro && (
        <div className="flex items-start gap-2 text-[#B23B36] text-sm bg-[#FBEAEA] rounded-xl px-3 py-2.5 mt-3">
          <Icon name="alerta" className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <button onClick={onCancelar} className="w-full py-3 mt-3 rounded-2xl font-bold text-[14px] bg-white border border-[var(--line)]">Voltar</button>
    </div>
  );
}
