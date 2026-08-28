"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { visualDaCategoria } from "@/lib/util/format";
import { criarCategoria, criarSubcategoria, excluirCategoria } from "@/lib/data/actions";
import type { CategoryTree } from "@/lib/types/database";

export function CategoriasForm({ categoryTree, onSalvo }: { categoryTree: CategoryTree[]; onSalvo: () => void }) {
  const [expandida, setExpandida] = useState<string | null>(null);
  const [novaSubDe, setNovaSubDe] = useState<string | null>(null);
  const [nomeSub, setNomeSub] = useState("");
  const [criandoRaiz, setCriandoRaiz] = useState(false);
  const [nomeRaiz, setNomeRaiz] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvarSub(parentId: string) {
    if (!nomeSub.trim()) return;
    setSalvando(true);
    try {
      await criarSubcategoria({ nome: nomeSub.trim(), parentId });
      setNomeSub(""); setNovaSubDe(null);
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarRaiz() {
    if (!nomeRaiz.trim()) return;
    setSalvando(true);
    try {
      await criarCategoria({ nome: nomeRaiz.trim() });
      setNomeRaiz(""); setCriandoRaiz(false);
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    setErro(null);
    try {
      await excluirCategoria(id);
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível excluir.");
    }
  }

  return (
    <div>
      <h3 className="text-[18px] font-extrabold mt-0.5 mb-1">Categorias</h3>
      <p className="text-[12.5px] text-[var(--muted)] mb-4">As categorias de fábrica não podem ser excluídas — só as que você criar.</p>

      {erro && (
        <div className="flex items-start gap-2 text-[#B23B36] text-sm bg-[#FBEAEA] rounded-xl px-3 py-2.5 mb-3">
          <Icon name="alerta" className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden mb-3.5">
        {categoryTree.map((cat) => {
          const vis = visualDaCategoria(cat.nome);
          const aberto = expandida === cat.id;
          return (
            <div key={cat.id} className="border-b border-[var(--line)] last:border-0">
              <button onClick={() => setExpandida(aberto ? null : cat.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <span className="w-[30px] h-[30px] rounded-[10px] grid place-items-center bg-[var(--surface-2)]" style={{ color: vis.cor }}>
                  <Icon name={vis.icone} className="w-[18px] h-[18px]" />
                </span>
                <div className="flex-1">
                  <div className="text-[14.5px] font-semibold">{cat.nome}</div>
                  <div className="text-[12px] text-[var(--muted)]">{cat.subs.length} subcategorias</div>
                </div>
                <Icon name="chev" className={`w-[16px] h-[16px] text-[var(--muted)] transition-transform ${aberto ? "rotate-90" : ""}`} />
              </button>

              {aberto && (
                <div className="pb-3 px-4">
                  {cat.subs.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2 pl-[42px] text-[13.5px]">
                      <span>{s.nome}</span>
                      {!s.is_sistema && (
                        <button onClick={() => remover(s.id)} className="text-[11.5px] text-[var(--out)] font-semibold">Excluir</button>
                      )}
                    </div>
                  ))}

                  {novaSubDe === cat.id ? (
                    <div className="flex gap-2 pl-[42px] mt-1.5">
                      <input
                        autoFocus
                        value={nomeSub}
                        onChange={(e) => setNomeSub(e.target.value)}
                        placeholder="Nome da subcategoria"
                        className="flex-1 border border-[var(--line)] rounded-lg px-2.5 py-1.5 text-[13px] outline-none"
                      />
                      <button onClick={() => salvarSub(cat.id)} disabled={salvando} className="text-[12.5px] font-bold text-[var(--brand)] px-2">Salvar</button>
                    </div>
                  ) : (
                    <button onClick={() => setNovaSubDe(cat.id)} className="pl-[42px] text-[12.5px] font-semibold text-[var(--brand)] mt-1">
                      + Subcategoria
                    </button>
                  )}

                  {!cat.is_sistema && (
                    <button onClick={() => remover(cat.id)} className="block pl-[42px] text-[11.5px] text-[var(--out)] font-semibold mt-2">
                      Excluir categoria
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!criandoRaiz ? (
        <button onClick={() => setCriandoRaiz(true)} className="w-full py-3 rounded-2xl font-bold text-[14px] border border-dashed border-[var(--line)] text-[var(--brand)]">
          + Nova categoria
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            autoFocus
            value={nomeRaiz}
            onChange={(e) => setNomeRaiz(e.target.value)}
            placeholder="Nome da categoria"
            className="flex-1 border border-[var(--line)] rounded-xl px-3 py-2.5 text-[14.5px] outline-none"
          />
          <button onClick={salvarRaiz} disabled={salvando} className="px-4 rounded-xl font-bold text-[13.5px] bg-[var(--brand)] text-white disabled:opacity-60">Salvar</button>
        </div>
      )}
    </div>
  );
}
