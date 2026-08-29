"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";

const MODULOS: Record<string, { label: string; desc: string; icone: string; rota: string; grad: string }> = {
  financeiro: {
    label: "Financeiro",
    desc: "Contas, cartões, compromissos",
    icone: "carteira",
    rota: "/financeiro",
    grad: "linear-gradient(150deg,#8A6BFF 0%,#6C4BF4 52%,#4E31C9 100%)",
  },
  atividades: {
    label: "Atividades",
    desc: "Tarefas de casa, em dupla",
    icone: "check",
    rota: "/atividades",
    grad: "linear-gradient(150deg,#3FCB9C 0%,#12A87A 55%,#0B7A57 100%)",
  },
  usuarios: {
    label: "Usuários",
    desc: "Quem acessa o quê",
    icone: "usuarios",
    rota: "/usuarios",
    grad: "linear-gradient(150deg,#F4B860 0%,#CF8A1C 55%,#9C6710 100%)",
  },
};

export function Launcher({ nome, modulos }: { nome: string; modulos: string[] }) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const disponiveis = modulos.filter((m) => MODULOS[m]);

  function abrirModulo(rota: string) {
    if (isNavigating) return;
    startNavigation(() => router.push(rota));
  }

  return (
    <div className="min-h-screen bg-[var(--bg,#F5F4FB)] px-5 pt-[calc(env(safe-area-inset-top)+26px)] pb-10 md:max-w-[900px] md:mx-auto">
      <div className="flex items-center gap-2.5 mb-8">
        <span className="w-[42px] h-[42px] rounded-[13px] grid place-items-center text-white shadow-lg shadow-[#4E31C9]/30" style={{ background: "linear-gradient(150deg,#8A6BFF,#6C4BF4 52%,#4E31C9)" }}>
          <Icon name="casa" className="w-[23px] h-[23px]" />
        </span>
        <div>
          <div className="text-[19px] font-extrabold tracking-tight leading-none">Home Care</div>
          <div className="text-[11px] text-[#6E7091] font-bold tracking-[0.1em] mt-0.5">KAD</div>
        </div>
      </div>

      <h1 className="text-[24px] font-extrabold tracking-tight mb-0.5">Olá, {nome}</h1>
      <p className="text-[13.5px] text-[#6E7091] mb-6">O que você quer abrir?</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {disponiveis.map((key) => {
          const m = MODULOS[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => abrirModulo(m.rota)}
              disabled={isNavigating}
              aria-busy={isNavigating}
              className="group relative overflow-hidden text-left rounded-[22px] p-[22px] text-white min-h-[128px] flex flex-col justify-between shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)] cursor-pointer select-none touch-manipulation transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(76,60,150,.08),0_18px_38px_rgba(76,60,150,.14)] active:translate-y-0 active:scale-[0.97] active:shadow-[0_1px_2px_rgba(76,60,150,.05),0_7px_18px_rgba(76,60,150,.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#6C4BF4] disabled:cursor-wait disabled:opacity-80"
              style={{ background: m.grad }}
            >
              <span className="w-[34px] h-[34px] rounded-[11px] bg-white/15 grid place-items-center transition-transform duration-150 group-active:scale-90">
                <Icon name={m.icone} className="w-[19px] h-[19px]" />
              </span>
              <div>
                <div className="text-[17px] font-extrabold tracking-tight mt-3.5">{m.label}</div>
                <div className="text-[12px] text-white/80 mt-0.5">{m.desc}</div>
              </div>

              {isNavigating && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]" aria-hidden="true">
                  <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {disponiveis.length === 0 && (
        <div className="text-center text-[13px] text-[#6E7091] mt-10">
          Você ainda não tem acesso a nenhum módulo. Peça ao dono da casa pra liberar.
        </div>
      )}
    </div>
  );
}
