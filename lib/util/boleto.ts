/**
 * Leitura de linha digitável / código de barras de boletos brasileiros.
 *
 * Existem dois formatos:
 *  - BANCÁRIO (ficha de compensação): o vencimento é codificado como um
 *    "fator de vencimento" — dias corridos desde 07/10/1997. Por isso,
 *    valor E vencimento sempre podem ser extraídos com certeza.
 *  - CONVÊNIO / ARRECADAÇÃO (concessionárias como a Equatorial): o valor
 *    é sempre confiável, mas o vencimento raramente vem codificado —
 *    ele só existe impresso no boleto. Por isso, quando só temos a foto
 *    do código de barras (sem o texto do PDF), pedimos para o usuário
 *    confirmar a data antes de salvar.
 */

export interface LeituraBoleto {
  tipo: "bancario" | "convenio";
  valor: number | null;
  vencimento: string | null; // YYYY-MM-DD
  linhaDigitavel: string;    // usada como dedup_key
}

const soDigitos = (s: string) => s.replace(/\D/g, "");

/** Converte o fator de vencimento (dias desde 07/10/1997) em data YYYY-MM-DD */
function fatorParaData(fator: number): string | null {
  if (!fator || fator <= 0) return null;
  const base = new Date(Date.UTC(1997, 9, 7)); // 07/10/1997
  const d = new Date(base.getTime() + fator * 86400000);
  return d.toISOString().slice(0, 10);
}

/**
 * Aceita tanto a linha digitável (com pontos/espaços) quanto o código de
 * barras puro (44 dígitos), em formato bancário (começa com código do
 * banco, ex. 341, 001, 033...) ou convênio (começa com 8).
 */
export function lerBoleto(entrada: string): LeituraBoleto | null {
  const digitos = soDigitos(entrada);

  // Convênio: sempre 44 dígitos, e o Febraban reserva o 1º dígito '8' para
  // arrecadação/concessionárias. O 3º dígito indica se o valor está no
  // próprio código (6 ou 7) ou em tabela externa (8/9).
  if (digitos.length === 44 && digitos[0] === "8") {
    const indicadorValor = digitos[2];
    let valor: number | null = null;
    if (indicadorValor === "6" || indicadorValor === "7") {
      const valorStr = digitos.slice(4, 15);
      valor = parseInt(valorStr, 10) / 100;
    }
    return { tipo: "convenio", valor, vencimento: null, linhaDigitavel: digitos };
  }

  // Bancário: linha digitável tem 47 dígitos (com DVs); código de barras puro tem 44.
  if (digitos.length === 47) {
    // campo 5 (posições 33-47, 0-indexed 32..46): DV geral(1) + fator(4) + valor(10)
    const campoLivreEFator = digitos.slice(32); // 15 dígitos: 1 dv + 4 fator + 10 valor
    const fator = parseInt(campoLivreEFator.slice(1, 5), 10);
    const valorStr = campoLivreEFator.slice(5, 15);
    const valor = parseInt(valorStr, 10) / 100;
    const vencimento = fatorParaData(fator);
    return { tipo: "bancario", valor: isNaN(valor) ? null : valor, vencimento, linhaDigitavel: digitos };
  }

  if (digitos.length === 44) {
    // código de barras bancário puro: banco(3) moeda(1) dv(1) fator(4) valor(10) campolivre(25)
    const fator = parseInt(digitos.slice(5, 9), 10);
    const valorStr = digitos.slice(9, 19);
    const valor = parseInt(valorStr, 10) / 100;
    const vencimento = fatorParaData(fator);
    return { tipo: "bancario", valor: isNaN(valor) ? null : valor, vencimento, linhaDigitavel: digitos };
  }

  return null;
}

/** Extrai valor, vencimento e mês de referência do TEXTO de uma fatura em PDF (contas de consumo em geral — energia, água). */
export interface LeituraPdfFatura {
  valor: number | null;
  vencimento: string | null; // YYYY-MM-DD
  referencia: string | null; // "Agosto/2026" como veio no texto
  linhaDigitavel: string | null;
}

export function lerTextoFaturaConsumo(texto: string): LeituraPdfFatura {
  const norm = texto.replace(/\u00a0/g, " ");

  // Valor: procura "Total a pagar" / "Valor a pagar" / "Valor do documento" seguido de R$
  const valorMatch =
    norm.match(/(?:total a pagar|valor a pagar|valor do documento)[^\d]{0,20}([\d.]+,\d{2})/i) ||
    norm.match(/R\$\s*([\d.]+,\d{2})/i);
  const valor = valorMatch ? parseFloat(valorMatch[1].replace(/\./g, "").replace(",", ".")) : null;

  // Vencimento: dd/mm/aaaa perto da palavra "vencimento"
  const vencMatch = norm.match(/vencimento[^\d]{0,15}(\d{2}\/\d{2}\/\d{4})/i);
  let vencimento: string | null = null;
  if (vencMatch) {
    const [d, m, y] = vencMatch[1].split("/");
    vencimento = `${y}-${m}-${d}`;
  }

  // Referência: "Mês/Ano de referência" tipo "AGOSTO/2026"
  const refMatch = norm.match(
    /refer[êe]ncia[^\wçÇ]{0,15}([A-ZÇa-zç]+\/\d{4})/i
  );
  const referencia = refMatch ? refMatch[1] : null;

  // Linha digitável: sequência de dígitos/pontos/espaços com pelo menos 40 dígitos no total
  const linhaMatch = norm.match(/(\d[\d.\s]{40,60}\d)/);
  const linhaDigitavel = linhaMatch ? soDigitos(linhaMatch[1]) : null;

  return { valor, vencimento, referencia, linhaDigitavel };
}
