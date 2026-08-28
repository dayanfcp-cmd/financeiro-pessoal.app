export type AccountType = "corrente" | "poupanca" | "cartao" | "carteira" | "investimento";
export type TransactionType = "receita" | "despesa" | "transferencia";
export type TransactionStatus = "efetivada" | "prevista";
export type CommitmentStatus = "pendente" | "pago" | "vencido" | "cancelado";

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

export interface Commitment {
  id: string;
  user_id: string;
  nome: string;
  category_id: string | null;
  valor: number;
  data_vencimento: string; // YYYY-MM-DD
  referencia: string | null;
  account_id: string | null;
  source_id: string | null;
  status: CommitmentStatus;
  dedup_key: string | null;
  matched_transaction_id: string | null;
}

export interface Receipt {
  id: string;
  user_id: string;
  storage_path: string;
  transaction_id: string | null;
  valor: number | null;
  data: string | null;
  estabelecimento: string | null;
}

/* ===================== Home Care (KAD) — multi-usuário ===================== */

export type HouseholdRole = "dono" | "membro";
export type ModuloId = "financeiro" | "atividades" | "usuarios";
export type Recorrencia = "diario" | "semanal" | "personalizado";

export interface Profile {
  id: string;
  household_id: string;
  nome: string;
  cor: string;
  papel: HouseholdRole;
  modulos: ModuloId[];
}

export interface Activity {
  id: string;
  household_id: string;
  nome: string;
  recorrencia: Recorrencia;
  dias_semana: number[] | null; // 0=Dom .. 6=Sáb
  responsavel: string | null;
  criado_por: string | null;
  ativo: boolean;
}

export interface ActivityCompletion {
  id: string;
  activity_id: string;
  household_id: string;
  data: string; // YYYY-MM-DD
  feito_por: string | null;
}

export interface ShoppingItem {
  id: string;
  household_id: string;
  nome: string;
  responsavel: string | null;
  comprado: boolean;
  criado_por: string | null;
}
