"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { visualDaCategoria } from "@/lib/util/format";
import { criarTransacao, criarTransferencia } from "@/lib/data/actions";
import { interpretarFala } from "@/lib/util/parseFala";
import type { Account, Card, CategoryTree } from "@/lib/types/database";

type Tipo = "despesa" | "receita" | "transferencia";

// A Web Speech API não tem tipos oficiais no TypeScript — declaração mínima do necessário.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

export function LancarForm({
  contas,
  cartoes,
  categoryTree,
  onSalvo,
}: {
  contas: Account[];
  cartoes: Card[];
  categoryTree: CategoryTree[];
  onSalvo: () => void;
}) {
  const [tipo, setTipo] = useState<Tipo>("despesa");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [catId, setCatId] = useState<string | null>(categoryTree[0]?.id ?? null);
  const [destino, setDestino] = useState(contas[0] ? `conta:${contas[0].id}` : "");
  const [de, setDe] = useState(contas[0] ? `conta:${contas[0].id}` : "");
  const [para, setPara] = useState(contas[1] ? `conta:${contas[1].id}` : "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [suportaVoz, setSuportaVoz] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [transcricao, setTranscricao] = useState<string | null>(null);
  const [avisoVoz, setAvisoVoz] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (SpeechRecognition) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- detecção de recurso do navegador após montar; é intencional e roda uma vez só
      setSuportaVoz(true);
    }
  }, []);

  function iniciarGravacao() {
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    setErro(null);
    setAvisoVoz(null);
    setTranscricao(null);

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "pt-BR";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (e) => {
      const ultimo = e.results[e.results.length - 1];
      const texto = ultimo[0].transcript;
      setTranscricao(texto);
      if (ultimo.isFinal) {
        aplicarTranscricao(texto);
      }
    };
    recognition.onerror = () => {
      setGravando(false);
      setErro("Não consegui ouvir. Verifique a permissão do microfone e tente de novo.");
    };
    recognition.onend = () => setGravando(false);

    recognitionRef.current = recognition;
    setGravando(true);
    recognition.start();
  }

  function pararGravacao() {
    recognitionRef.current?.stop();
    setGravando(false);
  }

  function aplicarTranscricao(texto: string) {
    const lida = interpretarFala(texto, categoryTree);
    setTipo(lida.tipo);
    if (lida.valor) setValor(lida.valor.toString().replace(".", ","));
    setDescricao(lida.descricao);
    if (lida.subcategoriaId) setCatId(lida.subcategoriaId);
    else if (lida.categoriaId) setCatId(lida.categoriaId);

    if (!lida.valor) setAvisoVoz("Não identifiquei o valor — confira o campo abaixo.");
  }

  const catAtual = categoryTree.find((c) => c.id === catId);

  const destinoOptions = [
    ...contas.map((c) => ({ value: `conta:${c.id}`, label: c.nome })),
    ...(tipo === "despesa"
      ? cartoes.map((c) => {
          const conta = contas.find((a) => a.id === c.account_id);
          return { value: `cartao:${c.account_id}`, label: `${conta?.nome ?? "Cartão"} (cartão)` };
        })
      : []),
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const v = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    if (!v || v <= 0) {
      setErro("Informe um valor para salvar.");
      return;
    }

    setSalvando(true);
    try {
      if (tipo === "transferencia") {
        const contaDeId = de.replace("conta:", "").replace("cartao:", "");
        const contaParaId = para.replace("conta:", "").replace("cartao:", "");
        await criarTransferencia({ valor: v, descricao, data, contaDeId, contaParaId });
      } else {
        const [kind, id] = destino.split(":");
        await criarTransacao({
          tipo,
          valor: v,
          descricao: descricao.trim() || "(sem descrição)",
          data,
          categoryId: catId,
          contaOuCartaoId: id,
        });
      }
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <h3 className="text-[18px] font-extrabold mt-0.5 mb-4">Lançar movimentação</h3>

      <div className="flex bg-[var(--surface-2)] rounded-[13px] p-1 gap-1 mb-4">
        {(["despesa", "receita", "transferencia"] as Tipo[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`flex-1 py-2.5 rounded-[10px] text-[13.5px] font-bold capitalize transition ${
              tipo === t ? "bg-white shadow text-[var(--ink)]" : "text-[var(--muted)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="text-center my-1.5 mb-5">
        <span className="text-[20px] text-[var(--muted)] font-semibold align-top">R$</span>
        <input
          autoFocus
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="0,00"
          className="border-0 text-[46px] font-extrabold text-center w-full tracking-tight bg-transparent outline-none num"
        />
      </div>

      {suportaVoz && (
        <div className="mb-4">
          <button
            type="button"
            onClick={gravando ? pararGravacao : iniciarGravacao}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-[14px] transition ${
              gravando ? "bg-[var(--out)] text-white" : "bg-[var(--brand-soft)] text-[var(--brand)]"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${gravando ? "bg-white animate-pulse" : "bg-[var(--brand)]"}`} />
            {gravando ? "Ouvindo... toque para parar" : "Falar o lançamento"}
          </button>
          {transcricao && (
            <p className="text-[12.5px] text-[var(--muted)] text-center mt-2 px-2">
              Você disse: <span className="italic">&ldquo;{transcricao}&rdquo;</span>
            </p>
          )}
          {avisoVoz && (
            <p className="text-[12px] text-[var(--warn)] text-center mt-1">{avisoVoz}</p>
          )}
        </div>
      )}

      <Field label="Descrição">
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Supermercado, Uber, Salário"
          className="w-full border border-[var(--line)] rounded-xl px-3.5 py-3 text-[15px] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
        />
      </Field>

      <Field label="Data">
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="w-full border border-[var(--line)] rounded-xl px-3.5 py-3 text-[15px] outline-none focus:border-[var(--brand)]"
        />
      </Field>

      {tipo !== "transferencia" && (
        <>
          <Field label="Categoria">
            <div className="flex gap-2 flex-wrap">
              {categoryTree.map((c) => {
                const vis = visualDaCategoria(c.nome);
                const ativo = catId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCatId(c.id)}
                    className={`inline-flex items-center gap-1.5 border rounded-full px-3.5 py-2 text-[13px] font-semibold ${
                      ativo ? "bg-[var(--brand)] border-[var(--brand)] text-white" : "border-[var(--line)] text-[var(--ink)]"
                    }`}
                  >
                    <Icon name={vis.icone} className="w-[15px] h-[15px]" style={{ color: ativo ? "#fff" : vis.cor }} />
                    {c.nome}
                  </button>
                );
              })}
            </div>
          </Field>

          {catAtual && catAtual.subs.length > 0 && (
            <Field label="Subcategoria">
              <select
                value={catId ?? ""}
                onChange={(e) => setCatId(e.target.value)}
                className="w-full border border-[var(--line)] rounded-xl px-3.5 py-3 text-[15px] outline-none"
              >
                <option value={catAtual.id}>{catAtual.nome} (geral)</option>
                {catAtual.subs.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Conta ou cartão">
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="w-full border border-[var(--line)] rounded-xl px-3.5 py-3 text-[15px] outline-none"
            >
              {destinoOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </>
      )}

      {tipo === "transferencia" && (
        <>
          <Field label="De qual conta">
            <select value={de} onChange={(e) => setDe(e.target.value)} className="w-full border border-[var(--line)] rounded-xl px-3.5 py-3 text-[15px] outline-none">
              {contas.map((c) => <option key={c.id} value={`conta:${c.id}`}>{c.nome}</option>)}
            </select>
          </Field>
          <Field label="Para qual conta">
            <select value={para} onChange={(e) => setPara(e.target.value)} className="w-full border border-[var(--line)] rounded-xl px-3.5 py-3 text-[15px] outline-none">
              {contas.map((c) => <option key={c.id} value={`conta:${c.id}`}>{c.nome}</option>)}
            </select>
          </Field>
        </>
      )}

      {erro && (
        <div className="flex items-start gap-2 text-[#B23B36] text-sm bg-[#FBEAEA] rounded-xl px-3 py-2.5 mb-2">
          <Icon name="alerta" className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={salvando}
        className={`w-full text-white font-extrabold py-[15px] rounded-2xl mt-2 mb-1 text-[16px] disabled:opacity-60 ${
          tipo === "receita" ? "bg-[var(--in)]" : tipo === "despesa" ? "bg-[var(--out)]" : "bg-[var(--brand)]"
        }`}
      >
        {salvando ? "Salvando…" : `Salvar ${tipo}`}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3.5">
      <span className="block text-[12.5px] font-bold text-[var(--muted)] mb-1.5">{label}</span>
      {children}
    </label>
  );
}
