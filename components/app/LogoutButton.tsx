"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  async function sair() {
    if (saindo) return;
    setSaindo(true);
    await createClient().auth.signOut();
    router.replace("/entrar");
    router.refresh();
  }
  return <button type="button" onClick={sair} disabled={saindo} className="fixed top-[calc(env(safe-area-inset-top)+14px)] right-4 z-50 px-3.5 py-2 rounded-xl bg-white border border-[#E9E7F5] shadow-sm text-[11px] font-extrabold text-[#6E7091] active:scale-95 disabled:opacity-60">{saindo ? "Saindo..." : "Sair"}</button>;
}
