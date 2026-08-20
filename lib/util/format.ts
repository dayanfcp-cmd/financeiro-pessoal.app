export function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDataCurta(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Mapeia o nome da categoria-raiz para cor e ícone — mesma paleta do protótipo. */
export const CATEGORIA_VISUAL: Record<string, { cor: string; icone: string }> = {
  Casa: { cor: "#6C4BF4", icone: "casa" },
  "Alimentação": { cor: "#E8663D", icone: "comida" },
  Transporte: { cor: "#2E80C4", icone: "transporte" },
  Financeiro: { cor: "#8B4FD6", icone: "financeiro" },
  "Educação": { cor: "#2FA36B", icone: "educacao" },
  Lazer: { cor: "#E0518A", icone: "lazer" },
  "Saúde": { cor: "#12B0A0", icone: "saude" },
};

export function visualDaCategoria(nome?: string | null) {
  return CATEGORIA_VISUAL[nome ?? ""] ?? { cor: "#6C4BF4", icone: "default" };
}
