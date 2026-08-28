/** Normaliza texto para fins de deduplicação e comparação: maiúsculas, sem acento, espaços únicos. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}
