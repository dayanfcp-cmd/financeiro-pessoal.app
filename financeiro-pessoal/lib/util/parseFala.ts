import { normalizar } from "./normalizar";
import type { CategoryTree } from "@/lib/types/database";

export interface FalaInterpretada {
  tipo: "receita" | "despesa";
  valor: number | null;
  descricao: string;
  categoriaId: string | null;
  subcategoriaId: string | null;
  transcricaoOriginal: string;
}

const VERBOS_RECEITA = ["recebi", "ganhei", "entrou", "caiu", "depositaram", "me pagaram", "faturei"];
const VERBOS_DESPESA = ["gastei", "paguei", "comprei", "gastou", "torrei"];

// sinônimos informais -> palavra que deve bater com o nome real da categoria/subcategoria
const SINONIMOS: Record<string, string> = {
  posto: "combustivel",
  gasolina: "combustivel",
  uber: "uber",
  "99": "uber",
  corrida: "uber",
  ifood: "delivery",
  lanche: "delivery",
  super: "mercado",
  supermercado: "mercado",
  feira: "mercado",
  padaria: "padaria",
  remedio: "farmacia",
  farmacia: "farmacia",
  medico: "consultas",
  consulta: "consultas",
  cinema: "cinema",
  netflix: "streaming",
  spotify: "streaming",
  streaming: "streaming",
  luz: "energia",
  energia: "energia",
  agua: "agua",
  internet: "internet",
  wifi: "internet",
  aluguel: "aluguel",
  pedagio: "pedagio",
  faculdade: "faculdade",
  curso: "cursos",
  restaurante: "restaurante",
  almoco: "restaurante",
  jantar: "restaurante",
};

function extrairValor(texto: string): number | null {
  // prioriza números seguidos de "reais"/"real"/"r$"
  const comMoeda = texto.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|conto|pila)/i);
  if (comMoeda) return parseFloat(comMoeda[1].replace(",", "."));

  const comCifrao = texto.match(/r\$\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (comCifrao) return parseFloat(comCifrao[1].replace(",", "."));

  const qualquerNumero = texto.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (qualquerNumero) return parseFloat(qualquerNumero[1].replace(",", "."));

  return null;
}

function extrairDescricao(texto: string): string {
  let limpo = texto;
  // remove os verbos-gatilho
  [...VERBOS_RECEITA, ...VERBOS_DESPESA].forEach((v) => {
    limpo = limpo.replace(new RegExp(`\\b${v}\\b`, "gi"), "");
  });
  // remove o trecho do valor (número + palavra de moeda)
  limpo = limpo.replace(/r\$\s*\d+(?:[.,]\d{1,2})?/gi, "");
  limpo = limpo.replace(/\d+(?:[.,]\d{1,2})?\s*(?:reais|real|conto|pila)?/gi, "");
  // remove preposições soltas no início/fim
  limpo = limpo.replace(/^\s*(de|do|da|no|na|em|com|por)\s+/i, "");
  limpo = limpo.replace(/\s+(de|do|da|no|na|em|com|por)\s*$/i, "");
  limpo = limpo.trim().replace(/\s+/g, " ");
  return limpo ? limpo.charAt(0).toUpperCase() + limpo.slice(1) : "(sem descrição)";
}

function sugerirCategoria(
  textoNormalizado: string,
  categoryTree: CategoryTree[]
): { categoriaId: string | null; subcategoriaId: string | null } {
  let melhor: { categoriaId: string; subcategoriaId: string | null; tamanho: number } | null = null;

  for (const raiz of categoryTree) {
    for (const sub of raiz.subs) {
      const nomeSub = normalizar(sub.nome).toLowerCase();
      if (textoNormalizado.includes(nomeSub) && (!melhor || nomeSub.length > melhor.tamanho)) {
        melhor = { categoriaId: raiz.id, subcategoriaId: sub.id, tamanho: nomeSub.length };
      }
    }
    const nomeRaiz = normalizar(raiz.nome).toLowerCase();
    if (textoNormalizado.includes(nomeRaiz) && (!melhor || nomeRaiz.length > (melhor?.tamanho ?? 0))) {
      melhor = { categoriaId: raiz.id, subcategoriaId: null, tamanho: nomeRaiz.length };
    }
  }

  if (melhor) return { categoriaId: melhor.categoriaId, subcategoriaId: melhor.subcategoriaId };

  // tenta pelos sinônimos informais
  for (const [chave, alvo] of Object.entries(SINONIMOS)) {
    if (textoNormalizado.includes(chave)) {
      for (const raiz of categoryTree) {
        for (const sub of raiz.subs) {
          if (normalizar(sub.nome).toLowerCase().includes(alvo)) {
            return { categoriaId: raiz.id, subcategoriaId: sub.id };
          }
        }
      }
    }
  }

  return { categoriaId: null, subcategoriaId: null };
}

export function interpretarFala(transcricao: string, categoryTree: CategoryTree[]): FalaInterpretada {
  const textoNorm = normalizar(transcricao).toLowerCase();

  let tipo: "receita" | "despesa" = "despesa";
  if (VERBOS_RECEITA.some((v) => textoNorm.includes(v))) tipo = "receita";

  const valor = extrairValor(transcricao);
  const descricao = extrairDescricao(transcricao);
  const { categoriaId, subcategoriaId } = sugerirCategoria(textoNorm, categoryTree);

  return { tipo, valor, descricao, categoriaId, subcategoriaId, transcricaoOriginal: transcricao };
}
