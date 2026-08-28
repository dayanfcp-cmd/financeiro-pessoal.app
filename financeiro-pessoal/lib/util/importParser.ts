import Papa from "papaparse";
import { normalizar } from "./normalizar";

export interface TransacaoImportada {
  data: string;      // YYYY-MM-DD
  valor: number;      // sempre positivo
  tipo: "receita" | "despesa";
  descricao: string;
  fitid: string | null; // identificador único do banco (só existe em OFX)
}

/** OFX bancário — aceita tanto SGML (tags sem fechamento) quanto XML (tags fechadas). */
export function parseOFX(texto: string): TransacaoImportada[] {
  const blocos = texto.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) ?? texto.match(/<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>)/gi) ?? [];
  const pegar = (bloco: string, tag: string) => {
    const m = bloco.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"));
    return m ? m[1].trim() : null;
  };

  const out: TransacaoImportada[] = [];
  for (const bloco of blocos) {
    const dtStr = pegar(bloco, "DTPOSTED");
    const amtStr = pegar(bloco, "TRNAMT");
    const memo = pegar(bloco, "MEMO") || pegar(bloco, "NAME") || "";
    const fitid = pegar(bloco, "FITID");
    if (!dtStr || !amtStr) continue;

    const ano = dtStr.slice(0, 4), mes = dtStr.slice(4, 6), dia = dtStr.slice(6, 8);
    const data = `${ano}-${mes}-${dia}`;
    const valorNum = parseFloat(amtStr.replace(",", "."));
    if (isNaN(valorNum) || valorNum === 0) continue;

    out.push({
      data,
      valor: Math.abs(valorNum),
      tipo: valorNum >= 0 ? "receita" : "despesa",
      descricao: memo || "(sem descrição)",
      fitid,
    });
  }
  return out;
}

/** CSV — tenta detectar automaticamente as colunas de data, valor e descrição. */
export function parseCSV(texto: string): { transacoes: TransacaoImportada[]; erro: string | null } {
  const resultado = Papa.parse<Record<string, string>>(texto, {
    header: true,
    skipEmptyLines: true,
    delimitersToGuess: [",", ";", "\t"],
  });

  if (!resultado.data.length) {
    return { transacoes: [], erro: "Não encontramos linhas nesse CSV." };
  }

  const colunas = resultado.meta.fields ?? [];
  const acha = (padroes: RegExp[]) => colunas.find((c) => padroes.some((p) => p.test(c)));

  const colData = acha([/^data/i, /date/i, /lan[çc]amento/i]);
  const colValor = acha([/^valor/i, /amount/i, /value/i, /r\$/i]);
  const colDesc = acha([/descri/i, /histor/i, /memo/i, /lan[çc]amento/i, /detalhe/i]);

  if (!colData || !colValor) {
    return {
      transacoes: [],
      erro: "Não conseguimos identificar as colunas de data e valor nesse CSV. Formatos aceitos variam por banco — me mostre uma linha de exemplo que eu ajusto a leitura.",
    };
  }

  const transacoes: TransacaoImportada[] = [];
  for (const linha of resultado.data) {
    const dataRaw = linha[colData]?.trim();
    const valorRaw = linha[colValor]?.trim();
    const descricao = colDesc ? (linha[colDesc]?.trim() || "(sem descrição)") : "(sem descrição)";
    if (!dataRaw || !valorRaw) continue;

    const data = parseDataFlexivel(dataRaw);
    const valorNum = parseFloat(valorRaw.replace(/\./g, "").replace(",", "."));
    if (!data || isNaN(valorNum) || valorNum === 0) continue;

    transacoes.push({
      data,
      valor: Math.abs(valorNum),
      tipo: valorNum >= 0 ? "receita" : "despesa",
      descricao,
      fitid: null,
    });
  }

  return { transacoes, erro: transacoes.length ? null : "Não conseguimos ler nenhuma linha válida desse CSV." };
}

function parseDataFlexivel(s: string): string | null {
  // dd/mm/aaaa ou dd-mm-aaaa
  let m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // aaaa-mm-dd (já no formato certo)
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  return null;
}

export { normalizar };
