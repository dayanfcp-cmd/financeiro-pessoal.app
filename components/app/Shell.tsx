"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { sair } from "@/lib/data/actions";

type Tab = "inicio" | "pagar" | "cartoes" | "mais";

export function Shell({
  mesLabel,
  onMudarMes,
  onLancar,
  views,
}: {
  mesLabel: string;
  onMudarMes: (delta: number) => void;
  onLancar: () => void;
  views: Record<Tab, React.ReactNode>;
}) {
  const [tab, setTab] = useState<Tab>("inicio");

  const itens: { id: Tab; label: string; icon: string }[] = [
    { id: "inicio", label: "Início", icon: "inicio" },
    { id: "pagar", label: "A pagar", icon: "pagar" },
    { id: "cartoes", label: "Cartões", icon: "cartoes" },
    { id: "mais", label: "Mais", icon: "mais" },
  ];

  return (
    <div className="md:flex md:max-w-[1180px] md:mx-auto md:min-h-screen md:shadow-[0_0_44px_rgba(76,60,150,0.10)]">
      {/* menu lateral — desktop */}
      <aside className="hidden md:flex md:flex-col md:w-[250px] md:flex-none bg-white border-r border-[var(--line)] px-4 py-6 gap-1 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-2 pb-5 font-extrabold text-[15.5px] tracking-tight">
          <span className="w-[30px] h-[30px] rounded-[9px] brand-gradient grid place-items-center text-white">
            <Icon name="carteira" className="w-[17px] h-[17px]" />
          </span>
          Minha vida financeira
        </div>
        {itens.map((it) => (
          <button
            key={it.id}
            onClick={() => setTab(it.id)}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[14.5px] font-semibold text-left transition ${
              tab === it.id ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            }`}
          >
            <Icon name={it.icon} className="w-5 h-5" />
            {it.label}
          </button>
        ))}
        <button
          onClick={onLancar}
          className="mt-3.5 rounded-[13px] bg-[var(--brand)] text-white font-extrabold py-3 flex items-center justify-center gap-2 shadow-lg shadow-[var(--brand)]/35"
        >
          <Icon name="plus" className="w-5 h-5" />
          Lançar
        </button>

        <form action={sair} className="mt-auto pt-4 border-t border-[var(--line)]">
          <button className="flex items-center gap-3 rounded-xl px-3 py-3 text-[13.5px] font-semibold text-[var(--muted)] hover:bg-[var(--surface-2)] w-full">
            <Icon name="sair" className="w-[18px] h-[18px]" />
            Sair
          </button>
        </form>
      </aside>

      {/* app */}
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0">
        <div className="sticky top-0 z-20 bg-[var(--bg)] px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-2 md:px-8 md:pt-6">
          <div className="text-[12px] tracking-[0.14em] uppercase text-[var(--muted)] font-bold">
            Minha vida financeira
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-[22px] md:text-[26px] font-extrabold tracking-tight">{mesLabel}</h1>
            <div className="flex gap-1.5">
              <button
                onClick={() => onMudarMes(-1)}
                aria-label="Mês anterior"
                className="w-[34px] h-[34px] rounded-full border border-[var(--line)] bg-white grid place-items-center"
              >
                ‹
              </button>
              <button
                onClick={() => onMudarMes(1)}
                aria-label="Próximo mês"
                className="w-[34px] h-[34px] rounded-full border border-[var(--line)] bg-white grid place-items-center"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-4 pb-32 md:px-8 md:pb-16">
          <div className="md:max-w-[760px]">{views[tab]}</div>
        </main>

        {/* nav inferior — mobile */}
        <nav
          className="md:hidden fixed left-0 right-0 bottom-0 z-30 bg-white border-t border-[var(--line)] flex max-w-[460px] mx-auto"
          style={{ height: "calc(64px + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <TabButton it={itens[0]} active={tab === "inicio"} onClick={() => setTab("inicio")} />
          <TabButton it={itens[1]} active={tab === "pagar"} onClick={() => setTab("pagar")} />
          <div className="flex-1 grid place-items-center">
            <button
              onClick={onLancar}
              aria-label="Lançar movimentação"
              className="relative -top-3.5 w-14 h-14 rounded-full bg-[var(--brand)] text-white grid place-items-center shadow-lg shadow-[var(--brand)]/45"
            >
              <Icon name="plus" className="w-6 h-6" />
            </button>
          </div>
          <TabButton it={itens[2]} active={tab === "cartoes"} onClick={() => setTab("cartoes")} />
          <TabButton it={itens[3]} active={tab === "mais"} onClick={() => setTab("mais")} />
        </nav>
      </div>
    </div>
  );
}

function TabButton({
  it,
  active,
  onClick,
}: {
  it: { id: Tab; label: string; icon: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-1.5 text-[10.5px] font-semibold ${
        active ? "text-[var(--brand)]" : "text-[var(--muted)]"
      }`}
    >
      <Icon name={it.icon} className="w-[23px] h-[23px]" />
      {it.label}
    </button>
  );
}
