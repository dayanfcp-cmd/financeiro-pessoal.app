"use client";
import { PainelAtividades } from "@/components/app/PainelAtividades";
import type { Activity, ActivityCompletion, Profile } from "@/lib/types/database";
export function AtividadesV2Client({ meuId, householdId, membros }: { meuId: string; householdId: string; membros: Profile[]; atividadesIniciais?: Activity[]; conclusoesHojeIniciais?: ActivityCompletion[]; comprasIniciais?: any[] }) {
  return <PainelAtividades meuId={meuId} householdId={householdId} membros={membros} />;
}
