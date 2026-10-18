"use client";

import { useState } from "react";
import Link from "next/link";

const TVs = [
  { id: "philco", nome: "Philco", detalhe: "TV da sala", iniciais: "P" },
  { id: "lg", nome: "LG", detalhe: "TV LG", iniciais: "LG" },
  { id: "samsung", nome: "Samsung Crystal", detalhe: "Crystal UHD", iniciais: "S" },
];

const comandos = [
  { id: "power", label: "Ligar / desligar", simbolo: "⏻" },
  { id: "vol-", label: "Volume −", simbolo: "−" },
  { id: "mute", label: "Mudo", simbolo: "🔇" },
  { id: "vol+", label: "Volume +", simbolo: "+" },
  { id: "back", label: "Voltar", simbolo: "↶" },
  { id: "home", label: "Início", simbolo: "⌂" },
  { id: "up", label: "Cima", simbolo: "↑" },
  { id: "left", label: "Esquerda", simbolo: "←" },
  { id: "ok", label: "OK", simbolo: "●" },
  { id: "right", label: "Direita", simbolo: "→" },
  { id: "down", label: "Baixo", simbolo: "↓" },
  { id: "source", label: "Entrada", simbolo: "▣" },
];

export default function ControleTVsPage() {
  const [tvId, setTvId] = useState("philco");
  const [aviso, setAviso] = useState("");
  const tv = TVs.find((item) => item.id === tvId) ?? TVs[0];

  function prepararComando(label: string) {
    setAviso(`Comando “${label}” selecionado para ${tv.nome}. A conexão com a TV ainda precisa ser configurada.`);
  }

  return (
    <main className="min-h-screen bg-[var(--bg,#F5F4FB)] px-5 pt-[calc(env(safe-area-inset-top)+22px)] pb-10 md:max-w-[760px] md:mx-auto">
      <div className="flex items-center gap-3 mb-7">
        <Link href="/" aria-label="Voltar" className="grid place-items-center w-10 h-10 rounded-xl bg-white border border-[#E9E7F5] text-[#4E31C9] text-xl">←</Link>
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-[#777792]">Home Care</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#24213D]">Controle de TVs</h1>
        </div>
      </div>

      <section className="rounded-3xl p-5 text-white shadow-lg mb-5" style={{ background: "linear-gradient(140deg,#6C4BF4,#4030A6)" }}>
        <div className="text-4xl mb-3" aria-hidden="true">📺</div>
        <h2 className="text-lg font-extrabold">Um controle, suas TVs</h2>
        <p className="text-sm text-white/80 mt-1">Escolha qual televisão quer controlar antes de usar os comandos.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-extrabold text-[#393653] mb-3">1. Escolha a televisão</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TVs.map((item) => (
            <button key={item.id} onClick={() => { setTvId(item.id); setAviso(""); }} className={`rounded-2xl border p-4 text-left transition-all ${tvId === item.id ? "border-[#6C4BF4] bg-[#EEEAFE] ring-2 ring-[#6C4BF4]/20" : "border-[#E9E7F5] bg-white"}`} aria-pressed={tvId === item.id}>
              <span className={`grid place-items-center w-11 h-11 rounded-xl font-extrabold mb-3 ${tvId === item.id ? "bg-[#6C4BF4] text-white" : "bg-[#F0EFF8] text-[#6C4BF4]"}`}>{item.iniciais}</span>
              <span className="block font-extrabold text-[#292641]">{item.nome}</span>
              <span className="block text-xs text-[#777792] mt-1">{item.detalhe}</span>
              {tvId === item.id && <span className="inline-block mt-3 text-xs font-bold text-[#5C42D6]">Selecionada ✓</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-[#E9E7F5] p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-extrabold text-[#292641]">2. Controle remoto</h2>
            <p className="text-sm text-[#777792]">Selecionada: {tv.nome}</p>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-bold bg-amber-50 text-amber-700">Configuração pendente</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {comandos.map((comando) => (
            <button key={comando.id} onClick={() => prepararComando(comando.label)} className={`min-h-[82px] rounded-2xl border border-[#E9E7F5] bg-[#FAF9FE] hover:bg-[#EEEAFE] active:scale-[0.98] flex flex-col items-center justify-center gap-2 text-[#4E31C9] ${comando.id === "power" ? "border-red-100 text-red-600 bg-red-50" : ""}`}>
              <span className="text-2xl font-bold" aria-hidden="true">{comando.simbolo}</span>
              <span className="text-xs font-bold text-[#393653]">{comando.label}</span>
            </button>
          ))}
        </div>
        {aviso && <p role="status" className="mt-4 rounded-xl bg-[#EEEAFE] p-3 text-sm text-[#4E31C9]">{aviso}</p>}
      </section>

      <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-extrabold text-amber-900">Falta conectar a TV de verdade</p>
        <p className="text-sm text-amber-800 mt-1">Esta primeira versão monta a tela e a seleção das TVs. Os comandos ainda não são enviados para os aparelhos. Para ativá-los, precisamos identificar os modelos exatos e verificar se aceitam controle pela rede Wi‑Fi ou por infravermelho.</p>
      </section>
    </main>
  );
}
