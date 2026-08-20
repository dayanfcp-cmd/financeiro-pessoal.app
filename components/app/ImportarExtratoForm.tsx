"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { parseOFX, parseCSV } from "@/lib/util/importParser";
import { analisarExtrato, confirmarImportacaoExtrato, type TransacaoClassificada } from "@/lib/data/actions";
import type { Account } from "@/lib/types/database";

export function ImportarExtratoForm({
  contas,
  onSalvo,
}: {
  contas: Account[];
  onSalvo: () => void;
}) {
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [classificadas, setClassificadas] = useState<TransacaoClassificada[] | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<{ inseridas: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !contaId) return;
    setErro(null);
    setClassificadas(null);
    setResultado(null);
    setNomeArquivo(file.name);
    setProcessando(true);

    try {
      const texto = await file.text();
      const isOfx = /\.ofx$/i.test(file.name) || /<OFX>/i.test(texto);
      let transacoes;
      if (isOfx) {
        transacoes = parseOFX(texto);
        if (transacoes.length === 0) {
          setErro("Não encontramos transações nesse arquivo OFX. Confira se o arquivo não está vazio ou corrompido.");
          setProcessando(false);
          return;
        }
      } else {
        const r = parseCSV(texto);
        if (r.erro) {
          setErro(r.erro);
          setProcessando(false);
          return;
        }
        transacoes = r.transacoes;
      }

      const result = await analisarExtrato(contaId, transacoes);
      setClassificadas(result);
    } catch {
      setErro("Não foi possível ler esse arquivo. Confira se é um .ofx ou .csv válido.");
    } finally {
      setProcessando(false);
    }
  }

  async function confirmar() {
    if (!classificadas) return;
    setSalvando(true);
    setErro(null);
    try {
      const r = await confirmarImportacaoExtrato(contaId, classificadas);
      setResultado(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível importar.");
    } finally {
      setSalvando(false);
    }
  }

  const novas = classificadas?.filter((t) => t.classificacao === "nova") ?? [];
  const existentes = classificadas?.filter((t) => t.classificacao === "existente") ?? [];

  if (resultado) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[var(--in)]/10 grid place-items-center text-[var(--in)]">
          <Icon name="check" className="w-7 h-7" />
        </div>
        <h3 className="text-[18px] font-extrabold mb-1">Importação concluída</h3>
        <p className="text-[13.5px] text-[var(--muted)] mb-5">
          {resultado.inseridas} {resultado.inseridas === 1 ? "lançamento novo foi adicionado" : "lançamentos novos foram adicionados"}.
        </p>
        <button onClick={onSalvo} className="w-full py-3.5 rounded-2xl font-bold text-[14.5px] bg-[var(--brand)] text-white">
          Ver movimentações
        </button>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-[18px] font-extrabold mt-0.5 mb-1">Importar extrato</h3>
      <p className="text-[12.5px] text-[var(--muted)] mb-4">
        Arquivo OFX ou CSV do seu banco. Nada é gravado antes de você conferir e confirmar.
      </p>

      {!classificadas && (
        <>
          <label className="block mb-3.5">
            <span className="block text-[12.5px] font-bold text-[var(--muted)] mb-1.5">Conta</span>
            <select
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
              className="w-full border border-[var(--line)] rounded-xl px-3.5 py-3 text-[15px] outline-none"
            >
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={processando || !contaId}
            className="w-full border-2 border-dashed border-[var(--line)] rounded-2xl py-10 flex flex-col items-center gap-2 text-[var(--muted)] disabled:opacity-60"
          >
            <Icon name="importar" className="w-8 h-8 text-[var(--brand)]" />
            <span className="font-semibold text-[var(--ink)]">{processando ? "Lendo..." : "Escolher arquivo OFX ou CSV"}</span>
            <span className="text-[12px]">extrato baixado do internet banking</span>
          </button>
          <input ref={fileInput} type="file" accept=".ofx,.csv,text/csv" className="hidden" onChange={onFile} />
        </>
      )}

      {classificadas && (
        <div>
          <div className="bg-white border border-[var(--line)] rounded-2xl p-4 mb-4">
            <div className="font-bold text-[14.5px] mb-2">{nomeArquivo}</div>
            <Linha label="Transações encontradas" valor={classificadas.length} />
            <Linha label="Novas" valor={novas.length} cor="var(--in)" destaque />
            <Linha label="Já existentes" valor={existentes.length} cor="var(--muted)" />
          </div>

          {erro && (
            <div className="flex items-start gap-2 text-[#B23B36] text-sm bg-[#FBEAEA] rounded-xl px-3 py-2.5 mb-3">
              <Icon name="alerta" className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => { setClassificadas(null); setErro(null); }}
              className="flex-1 py-3.5 rounded-2xl font-bold text-[14.5px] bg-white border border-[var(--line)]"
            >
              Escolher outro
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={salvando || novas.length === 0}
              className="flex-1 py-3.5 rounded-2xl font-bold text-[14.5px] bg-[var(--brand)] text-white disabled:opacity-60"
            >
              {salvando ? "Importando..." : `Importar ${novas.length}`}
            </button>
          </div>
        </div>
      )}

      {erro && !classificadas && (
        <div className="flex items-start gap-2 text-[#B23B36] text-sm bg-[#FBEAEA] rounded-xl px-3 py-2.5 mt-3">
          <Icon name="alerta" className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}
    </div>
  );
}

function Linha({ label, valor, cor, destaque }: { label: string; valor: number; cor?: string; destaque?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 text-[14.5px]">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={`num ${destaque ? "font-extrabold" : "font-semibold"}`} style={cor ? { color: cor } : undefined}>{valor}</span>
    </div>
  );
}
