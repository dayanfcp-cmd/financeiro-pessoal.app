"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import type { Activity, ActivityCompletion, ActivityOccurrenceOverride, Profile, ShoppingItem, Recorrencia, ActivityType, ActivityPeriod } from "@/lib/types/database";
import { PainelAtividades } from "@/components/app/PainelAtividades";

export function AtividadesV2Client(props: { meuId:string; householdId:string; membros:Profile[]; atividadesIniciais:Activity[]; conclusoesHojeIniciais:ActivityCompletion[]; comprasIniciais:ShoppingItem[] }) {
  const [atividades] = useState<Activity[]>(props.atividadesIniciais);
  const [conclusoes] = useState<ActivityCompletion[]>(props.conclusoesHojeIniciais);
  const [periodo] = useState<ActivityPeriod>("matutino");
  const router = useRouter();
  useEffect(() => { router.refresh(); }, [router]);
  const ordem: Record<ActivityPeriod, number> = { matutino: 0, vespertino: 1, noturno: 2 };
  const atividadesOrdenadas = useMemo(() => [...atividades].sort((a,b) => ordem[(a as any).periodo ?? "matutino"] - ordem[(b as any).periodo ?? "matutino"]), [atividades]);
  return <div className="space-y-4"><PainelAtividades atividades={atividadesOrdenadas} conclusoes={conclusoes} membros={props.membros} meuId={props.meuId} /><div className="hidden">{periodo}</div></div>;
}
