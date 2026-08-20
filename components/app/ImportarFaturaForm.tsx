"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { lerBoleto, lerTextoFaturaConsumo } from "@/lib/util/boleto";
import { importarCompromissoFatura } from "@/lib/data/actions";

type Extraido = {
  nome: string;
  valor: number | null;
  vencimento: string | null; // YYYY-MM-DD
  referencia: string | null;
  dedupKey: string;
  precisaConfirmarData: boolean;
};

type Concessionaria = {
  id: string;
  label: string;
  nomeConta: string;
  categoriaNome: string;
  icone: string;
};

const CONCESSIONARIAS: Concessionaria[] = [
  { id: "equatorial", label: "Energia (Equatorial)", nomeConta: "Energia — Equatorial", categoriaNome: "Energia", icone: "casa" },
  { id: "saneago", label: "Água (Saneago)", nomeConta: "Água — Saneago", categoriaNome: "Água", icone: "casa" },
];

export function ImportarFaturaForm({ onSalvo }: { onSalvo: () => void }) {
  const [concessionaria, setConcessionaria] = useState<Concessionaria>(CONCESSIONARIAS[0]);
  const [modo, setModo] = useState<"pdf" | "foto">("pdf");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<Extraido | null>(null);
  const [vencManual, setVencManual] = useState("");
  const [salvando, setSalvando] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handlePdf(file: File) {
    setErro(null);
    setProcessando(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/extrair-pdf", { method: "POST", body: form });
      if (!res.ok) throw new Error("Não foi possível ler esse PDF.");
      const { text } = await res.json();
      const lido = lerTextoFaturaConsumo(text);
      if (!lido.valor) {
        setErro("Não encontrei o valor da fatura nesse PDF. Tente a foto do código de barras.");
        setProcessando(false);
        return;
      }
      setDados({
        nome: concessionaria.nomeConta,
        valor: lido.valor,
        vencimento: lido.vencimento,
        referencia: lido.referencia,
        dedupKey: lido.linhaDigitavel || `${concessionaria.id}:${lido.referencia}:${lido.valor}`,
        precisaConfirmarData: !lido.vencimento,
      });
      setVencManual(lido.vencimento || "");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao processar o PDF.");
    } finally {
      setProcessando(false);
    }
  }

  async function handleFoto(file: File) {
    setErro(null);
    setProcessando(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/library");
      const reader = new BrowserMultiFormatReader();
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      const result = await reader.decodeFromImageElement(img);
      URL.revokeObjectURL(url);
      const texto = result.getText();
      const lido = lerBoleto(texto);
      if (!lido || !lido.valor) {
        setErro("Não consegui ler o código de barras dessa foto. Tente uma foto mais nítida, bem enquadrada e sem reflexo.");
        setProcessando(false);
        return;
      }
      setDados({
        nome: concessionaria.nomeConta,
        valor: lido.valor,
        vencimento: lido.vencimento,
        referencia: null,
        dedupKey: lido.linhaDigitavel,
        precisaConfirmarData: !lido.vencimento,
      });
      setVencManual(lido.vencimento || "");
    } catch {
      setErro("Não consegui ler o código de barras dessa foto. Tente uma foto mais nítida, bem enquadrada e sem reflexo.");
    } finally {
      setProcessando(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDados(null);
    if (modo === "pdf") handlePdf(file);
    else handleFoto(file);
  }

  async function confirmar() {
    if (!dados) return;
    const vencimentoFinal = dados.vencimento || vencManual;
    if (!vencimentoFinal) {
      setErro("Informe a data de vencimento para salvar.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await importarCompromissoFatura({
        nome: dados.nome,
        valor: dados.valor!,
        dataVencimento: vencimentoFinal,
        referencia: dados.referencia,
        categoriaNome: concessionaria.categoriaNome,
        dedupKey: dados.dedupKey,
      });
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <h3 className="text-[18px] font-extrabold mt-0.5 mb-1">Importar fatura</h3>
      <p className="text-[12.5px] text-[var(--muted)] mb-4">
        Envie o PDF (ou a foto do código de barras) da fatura — sem senhas, sem login em nenhum site.
      </p>

      {!dados && (
        <>
          <div className="mb-4">
            <span className="block text-[12.5px] font-bold text-[var(--muted)] mb-1.5">Conta</span>
            <div className="flex gap-2">
              {CONCESSIONARIAS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setConcessionaria(c)}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border ${
                    concessionaria.id === c.id ? "bg-[var(--brand)] border-[var(--brand)] text-white" : "border-[var(--line)] text-[var(--ink)]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex bg-[var(--surface-2)] rounded-[13px] p-1 gap-1 mb-4">
            <button
              type="button"
              onClick={() => setModo("pdf")}
              className={`flex-1 py-2.5 rounded-[10px] text-[13.5px] font-bold transition ${modo === "pdf" ? "bg-white shadow text-[var(--ink)]" : "text-[var(--muted)]"}`}
            >
              PDF da fatura
            </button>
            <button
              type="button"
              onClick={() => setModo("foto")}
              className={`flex-1 py-2.5 rounded-[10px] text-[13.5px] font-bold transition ${modo === "foto" ? "bg-white shadow text-[var(--ink)]" : "text-[var(--muted)]"}`}
            >
              Foto do código de barras
            </button>
          </div>

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={processando}
            className="w-full border-2 border-dashed border-[var(--line)] rounded-2xl py-10 flex flex-col items-center gap-2 text-[var(--muted)] disabled:opacity-60"
          >
            <Icon name={modo === "pdf" ? "comprovante" : "importar"} className="w-8 h-8 text-[var(--brand)]" />
            <span className="font-semibold text-[var(--ink)]">
              {processando ? "Lendo..." : modo === "pdf" ? "Escolher o PDF da fatura" : "Tirar ou escolher a foto"}
            </span>
            <span className="text-[12px]">{modo === "pdf" ? "arquivo .pdf" : "código de barras bem enquadrado"}</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={modo === "pdf" ? "application/pdf" : "image/*"}
            capture={modo === "foto" ? "environment" : undefined}
            className="hidden"
            onChange={onFile}
          />
        </>
      )}

      {dados && (
        <div>
          <div className="bg-[var(--brand-soft)] text-[var(--brand-deep)] rounded-2xl p-4 mb-4">
            <div className="text-[12px] font-bold uppercase tracking-wide opacity-70 mb-2">{concessionaria.label} — encontramos isto</div>
            <div className="flex justify-between py-1.5 text-[15px]">
              <span className="text-[var(--muted)]">Valor</span>
              <span className="font-extrabold num">{dados.valor?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
            {dados.referencia && (
              <div className="flex justify-between py-1.5 text-[15px]">
                <span className="text-[var(--muted)]">Referência</span>
                <span className="font-semibold">{dados.referencia}</span>
              </div>
            )}
          </div>

          {dados.precisaConfirmarData ? (
            <div className="mb-4">
              <label className="block text-[12.5px] font-bold text-[var(--muted)] mb-1.5">
                Não encontramos a data de vencimento no código de barras — confirme:
              </label>
              <input
                type="date"
                value={vencManual}
                onChange={(e) => setVencManual(e.target.value)}
                className="w-full border border-[var(--line)] rounded-xl px-3.5 py-3 text-[15px] outline-none focus:border-[var(--brand)]"
              />
            </div>
          ) : (
            <div className="flex justify-between py-1.5 text-[15px] mb-4 px-1">
              <span className="text-[var(--muted)]">Vencimento</span>
              <span className="font-semibold">{dados.vencimento && new Date(dados.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</span>
            </div>
          )}

          {erro && (
            <div className="flex items-start gap-2 text-[#B23B36] text-sm bg-[#FBEAEA] rounded-xl px-3 py-2.5 mb-3">
              <Icon name="alerta" className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => { setDados(null); setErro(null); }}
              className="flex-1 py-3.5 rounded-2xl font-bold text-[14.5px] bg-white border border-[var(--line)]"
            >
              Tentar de novo
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={salvando}
              className="flex-1 py-3.5 rounded-2xl font-bold text-[14.5px] bg-[var(--brand)] text-white disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Confirmar e salvar"}
            </button>
          </div>
        </div>
      )}

      {erro && !dados && (
        <div className="flex items-start gap-2 text-[#B23B36] text-sm bg-[#FBEAEA] rounded-xl px-3 py-2.5 mt-3">
          <Icon name="alerta" className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}
    </div>
  );
}
