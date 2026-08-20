export type AccountType = "corrente" | "poupanca" | "cartao" | "carteira" | "investimento";
export type TransactionType = "receita" | "despesa" | "transferencia";
export type TransactionStatus = "efetivada" | "prevista";

export interface Account {
  id: string;
  user_id: string;
  nome: string;
  tipo: AccountType;
  instituicao: string | null;
  saldo_inicial: number;
  ativo: boolean;
}

export interface Card {
  id: string;
  user_id: string;
  account_id: string;
  limite: number;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
  melhor_dia_compra: number | null;
}

export interface Category {
  id: string;
  user_id: string;
  nome: string;
  parent_id: string | null;
  cor: string | null;
  icone: string | null;
  is_sistema: boolean;
}

export interface Source {
  id: string;
  user_id: string;
  tipo: "manual" | "arquivo" | "banco" | "consumo" | "fiscal";
  descricao: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  data: string; // YYYY-MM-DD
  valor: number;
  tipo: TransactionType;
  descricao_original: string | null;
  descricao_normalizada: string | null;
  category_id: string | null;
  source_id: string | null;
  dedup_key: string;
  transfer_group_id: string | null;
  status: TransactionStatus;
}

/** Categoria raiz com suas subcategorias já agrupadas — usado pela UI */
export interface CategoryTree extends Category {
  subs: Category[];
}
