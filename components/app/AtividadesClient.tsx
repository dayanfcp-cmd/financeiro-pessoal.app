"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import {
  criarAtividade,
  excluirAtividade,
  alternarConclusao,
  criarItemCompra,
  alternarComprado,
  excluirItemCompra,
} from "@/lib/data/actions";
import type { Activity, ActivityCompletion, ShoppingItem, Profile } from "@/lib/types/database";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const ACCENT = "#12A87A";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}
function vencehoje(a: Activity, diaSemana: number) {
  return a.recorrencia === "diario" || (a.dias_semana ?? []).includes(diaSemana);
}

export function AtividadesClient({
  meuId,
  membros,
  atividadesIniciais,
  conclusoesHojeIniciais,
  comprasIniciais,
}: {
  meuId: string;
  membros: Profile[];
  atividadesIniciais: Activity[];
  conclusoesHojeIniciais: ActivityCompletion[];
  comprasIniciais: ShoppingItem[];
}) {
  const router = useRouter();
  const [aba, setAba] = useState<"hoje" | "semana" | "compras" | "painel">("hoje");
  const [atividades, setAtividades] = useState(atividadesIniciais);
  const [conclusoesHoje, setConclusoesHoje] = useState(conclusoesHojeIniciais);
  const [compras, setCompras] = useState(comprasIniciais);
  const [sheet, setSheet] = useState<"nenhum" | "novaAtividade" | "novaCompra">("nenhum");

  const hoje = new Date();
  const diaSemanaHoje = hoje.getDay();

  const membroPorId = new Map(membros.map((m) => [m.id, m]));

  async function recarregar() {
    const supabase = createClient();
    const [a, c, cp] = await Promise.all([
      supabase.from("activities").select("*").eq("ativo", true).order("created_at"),
      supabase.from("activity_completions").select("*").eq("data", hojeISO()),
      supabase.from("shopping_items").select("*").order("created_at"),
    ]);
    if (a.data) setAtividades(a.data as Activity[]);
    if (c.data) setConclusoesHoje(c.data as ActivityCompletion[]);
    if (cp.data) setCompras(cp.data as ShoppingItem[]);
  }

  async function toggleAtividade(id: string) {
    const jaConcluida = conclusoesHoje.some((c) => c.activity_id === id);
    // atualização otimista
    setConclusoesHoje((prev) =>
      jaConcluida ? prev.filter((c) => c.activity_id !== id) : [...prev, { id: "tmp", activity_id: id, household_id: "", data: hojeISO(), feito_por: meuId }]
    );
    await alternarConclusao(id, hojeISO(), jaConcluida);
    recarregar();
  }

  async function toggleCompra(item: ShoppingItem) {
    setCompras((prev) => prev.map((c) => (c.id === item.id ? { ...c, comprado: !c.comprado } : c)));
    await alternarComprado(item.id, item.comprado);
  }

  const minhasHoje = atividades.filter((a) => vencehoje(a, diaSemanaHoje) && a.responsavel === meuId);
  const feitasIds = new Set(conclusoesHoje.map((c) => c.activity_id));

  return (
    <div className="min-h-screen bg-[var(--bg,#F5F4FB)] pb-24">
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-3 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="w-9 h-9 rounded-full bg-white border border-[#E9E7F5] grid place-items-center flex-none">
          <Icon name="chev" className="w-4 h-4 rotate-180 text-[#6E7091]" />
        </button>
        <h1 className="text-[19px] font-extrabold tracking-tight">
          {aba === "hoje" && "Hoje"}
          {aba === "semana" && "Semana"}
          {aba === "compras" && "Lista de compras"}
          {aba === "painel" && "Painel"}
        </h1>
      </div>

      <div className="px-5 md:max-w-[640px] md:mx-auto">
        {aba === "hoje" && (
          <AbaHoje
            atividades={minhasHoje}
            feitasIds={feitasIds}
            onToggle={toggleAtividade}
            onExcluir={async (id) => { await excluirAtividade(id); recarregar(); }}
          />
        )}
        {aba === "semana" && <AbaSemana atividades={atividades} membroPorId={membroPorId} />}
        {aba === "compras" && (
          <AbaCompras
            itens={compras}
            membroPorId={membroPorId}
            onToggle={toggleCompra}
            onExcluir={async (id) => { await excluirItemCompra(id); recarregar(); }}
          />
        )}
        {aba === "painel" && (
          <AbaPainel atividades={atividades} membros={membros} conclusoesHoje={conclusoesHoje} diaSemanaHoje={diaSemanaHoje} />
        )}
      </div>

      <nav className="fixed left-0 right-0 bottom-0 z-30 h-[calc(60px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-white border-t border-[#E9E7F5] flex max-w-[460px] mx-auto md:max-w-[640px]">
        <TabBtn icon="calendario" label="Hoje" on={aba === "hoje"} onClick={() => setAba("hoje")} />
        <TabBtn icon="calendario" label="Semana" on={aba === "semana"} onClick={() => setAba("semana")} />
        <div className="flex-1 grid place-items-center">
          <button
            onClick={() => setSheet(aba === "compras" ? "novaCompra" : "novaAtividade")}
            className="relative -top-3 w-[52px] h-[52px] rounded-full text-white grid place-items-center shadow-lg"
            style={{ background: ACCENT }}
            aria-label="Adicionar"
          >
            <Icon name="plus" className="w-6 h-6" />
          </button>
        </div>
        <TabBtn icon="carrinho" label="Compras" on={aba === "compras"} onClick={() => setAba("compras")} />
        <TabBtn icon="painel" label="Painel" on={aba === "painel"} onClick={() => setAba("painel")} />
      </nav>

      {sheet === "novaAtividade" && (
        <SheetNovaAtividade
          membros={membros}
          onFechar={() => setSheet("nenhum")}
          onSalvo={() => { setSheet("nenhum"); recarregar(); }}
        />
      )}
      {sheet === "novaCompra" && (
        <SheetNovaCompra
          membros={membros}
          onFechar={() => setSheet("nenhum")}
          onSalvo={() => { setSheet("nenhum"); recarregar(); }}
        />
      )}
    </div>
  );
}

function TabBtn({ icon, label, on, onClick }: { icon: string; label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex-1 flex flex-col items-center justify-center gap-1 pt-1" style={{ color: on ? ACCENT : "#6E7091" }}>
      <Icon name={icon} className="w-5 h-5" />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function ChkRow({
  titulo,
  meta,
  feito,
  onToggle,
  onExcluir,
}: {
  titulo: string;
  meta: React.ReactNode;
  feito: boolean;
  onToggle: () => void;
  onExcluir?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3 px-1 border-b border-[#E9E7F5] last:border-0">
      <button
        onClick={onToggle}
        className="w-6 h-6 rounded-lg border-2 flex-none grid place-items-center"
        style={{ background: feito ? ACCENT : "#fff", borderColor: feito ? ACCENT : "#E9E7F5" }}
      >
        {feito && <Icon name="check" className="w-3.5 h-3.5 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-[14.5px] font-semibold ${feito ? "line-through text-[#6E7091]" : ""}`}>{titulo}</div>
        <div className="text-[11.5px] text-[#6E7091] mt-0.5">{meta}</div>
      </div>
      {onExcluir && (
        <button onClick={onExcluir} className="text-[11px] text-[#F0616D] font-semibold px-1.5">Excluir</button>
      )}
    </div>
  );
}

function Avatar({ perfil }: { perfil: Profile | undefined }) {
  if (!perfil) return <span className="text-[11px] text-[#6E7091]">sem responsável</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-4 h-4 rounded-full grid place-items-center text-[8.5px] font-extrabold text-white" style={{ background: perfil.cor }}>
        {perfil.nome.charAt(0).toUpperCase()}
      </span>
      {perfil.nome}
    </span>
  );
}

function Empty({ texto }: { texto: string }) {
  return <div className="text-center text-[13px] text-[#6E7091] py-10">{texto}</div>;
}

function AbaHoje({
  atividades,
  feitasIds,
  onToggle,
  onExcluir,
}: {
  atividades: Activity[];
  feitasIds: Set<string>;
  onToggle: (id: string) => void;
  onExcluir: (id: string) => void;
}) {
  const feitas = atividades.filter((a) => feitasIds.has(a.id)).length;
  return (
    <div className="pt-1">
      <div className="flex items-baseline justify-between mb-2 px-1">
        <span className="text-[13px] font-bold text-[#6E7091]">Suas tarefas de hoje</span>
        <span className="text-[12px] text-[#6E7091]">{feitas}/{atividades.length}</span>
      </div>
      <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)] px-4">
        {atividades.length === 0 ? (
          <Empty texto="Nada atribuído a você hoje" />
        ) : (
          atividades.map((a) => (
            <ChkRow
              key={a.id}
              titulo={a.nome}
              meta={a.recorrencia === "diario" ? "todo dia" : "hoje"}
              feito={feitasIds.has(a.id)}
              onToggle={() => onToggle(a.id)}
              onExcluir={() => onExcluir(a.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AbaSemana({ atividades, membroPorId }: { atividades: Activity[]; membroPorId: Map<string, Profile> }) {
  const [diaSel, setDiaSel] = useState(new Date().getDay());
  const doDia = atividades.filter((a) => vencehoje(a, diaSel));
  return (
    <div className="pt-1">
      <div className="grid grid-cols-7 gap-1.5 mb-4">
        {DIAS.map((d, i) => {
          const temAlgo = atividades.some((a) => vencehoje(a, i));
          return (
            <button
              key={d}
              onClick={() => setDiaSel(i)}
              className="rounded-xl py-2 text-center bg-white shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)]"
              style={{ border: diaSel === i ? `2px solid ${ACCENT}` : "2px solid transparent" }}
            >
              <div className="text-[9.5px] font-bold text-[#6E7091] uppercase">{d}</div>
              {temAlgo && <div className="w-1 h-1 rounded-full mx-auto mt-1" style={{ background: ACCENT }} />}
            </button>
          );
        })}
      </div>
      <div className="text-[13px] font-bold text-[#6E7091] mb-2 px-1">{DIAS[diaSel]}-feira</div>
      <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)] px-4">
        {doDia.length === 0 ? (
          <Empty texto="Nada nesse dia" />
        ) : (
          doDia.map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-3 border-b border-[#E9E7F5] last:border-0">
              <div className="flex-1">
                <div className="text-[14.5px] font-semibold">{a.nome}</div>
                <div className="text-[11.5px] text-[#6E7091] mt-0.5"><Avatar perfil={membroPorId.get(a.responsavel ?? "")} /></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AbaCompras({
  itens,
  membroPorId,
  onToggle,
  onExcluir,
}: {
  itens: ShoppingItem[];
  membroPorId: Map<string, Profile>;
  onToggle: (item: ShoppingItem) => void;
  onExcluir: (id: string) => void;
}) {
  const pendentes = itens.filter((i) => !i.comprado);
  const compradas = itens.filter((i) => i.comprado);
  return (
    <div className="pt-1">
      <div className="text-[13px] font-bold text-[#6E7091] mb-2 px-1">{pendentes.length} pendente{pendentes.length === 1 ? "" : "s"}</div>
      <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)] px-4">
        {itens.length === 0 ? (
          <Empty texto="Lista vazia" />
        ) : (
          [...pendentes, ...compradas].map((i) => (
            <ChkRow
              key={i.id}
              titulo={i.nome}
              meta={<Avatar perfil={membroPorId.get(i.responsavel ?? "")} />}
              feito={i.comprado}
              onToggle={() => onToggle(i)}
              onExcluir={() => onExcluir(i.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AbaPainel({
  atividades,
  membros,
  conclusoesHoje,
  diaSemanaHoje,
}: {
  atividades: Activity[];
  membros: Profile[];
  conclusoesHoje: ActivityCompletion[];
  diaSemanaHoje: number;
}) {
  const feitasIds = new Set(conclusoesHoje.map((c) => c.activity_id));
  return (
    <div className="pt-1">
      <div className="text-[13px] font-bold text-[#6E7091] mb-2 px-1">Hoje, por pessoa</div>
      <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)] p-4 mb-5">
        {membros.map((m) => {
          const dele = atividades.filter((a) => vencehoje(a, diaSemanaHoje) && a.responsavel === m.id);
          const feitas = dele.filter((a) => feitasIds.has(a.id)).length;
          const pct = dele.length ? Math.round((feitas / dele.length) * 100) : 0;
          return (
            <div key={m.id} className="mb-3.5 last:mb-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[13.5px] font-bold flex items-center gap-2"><Avatar perfil={m} /></span>
                <span className="text-[13px] font-extrabold" style={{ color: ACCENT }}>{feitas}/{dele.length}</span>
              </div>
              <div className="h-2 rounded-full bg-[#F1EFFA] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ACCENT }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[13px] font-bold text-[#6E7091] mb-2 px-1">Todas as tarefas de hoje</div>
      <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)] px-4">
        {atividades.filter((a) => vencehoje(a, diaSemanaHoje)).length === 0 ? (
          <Empty texto="Nada marcado pra hoje" />
        ) : (
          atividades.filter((a) => vencehoje(a, diaSemanaHoje)).map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-3 border-b border-[#E9E7F5] last:border-0">
              <span className="w-5 h-5 rounded-md flex-none grid place-items-center" style={{ background: feitasIds.has(a.id) ? ACCENT : "#F1EFFA" }}>
                {feitasIds.has(a.id) && <Icon name="check" className="w-3 h-3 text-white" />}
              </span>
              <div className="flex-1">
                <div className={`text-[14px] font-semibold ${feitasIds.has(a.id) ? "line-through text-[#6E7091]" : ""}`}>{a.nome}</div>
              </div>
              <span className="text-[11px] text-[#6E7091]"><Avatar perfil={membros.find((m) => m.id === a.responsavel)} /></span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SheetNovaAtividade({
  membros,
  onFechar,
  onSalvo,
}: {
  membros: Profile[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState("");
  const [regra, setRegra] = useState<"diario" | "semanal" | "personalizado">("diario");
  const [diasSel, setDiasSel] = useState<number[]>([]);
  const [responsavel, setResponsavel] = useState<string | null>(membros[0]?.id ?? null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function toggleDia(i: number) {
    if (regra === "semanal") { setDiasSel([i]); return; }
    setDiasSel((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]));
  }

  async function salvar() {
    if (!nome.trim()) { setErro("Dê um nome pra atividade."); return; }
    if (regra !== "diario" && diasSel.length === 0) { setErro("Escolha pelo menos um dia."); return; }
    setSalvando(true);
    setErro(null);
    try {
      await criarAtividade({ nome: nome.trim(), recorrencia: regra, diasSemana: regra === "diario" ? null : diasSel, responsavel });
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative bg-white w-full max-w-[460px] rounded-t-[24px] p-5 pb-[calc(24px+env(safe-area-inset-bottom))] max-h-[88vh] overflow-y-auto">
        <div className="w-10 h-1.5 rounded-full bg-[#E9E7F5] mx-auto mb-4" />
        <h3 className="text-[18px] font-extrabold mb-4">Nova atividade</h3>

        <label className="block mb-3.5">
          <span className="block text-[12px] font-bold text-[#6E7091] mb-1.5">Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Lavar a louça" className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-2.5 text-[14.5px] outline-none" />
        </label>

        <div className="mb-3.5">
          <span className="block text-[12px] font-bold text-[#6E7091] mb-1.5">Regularidade</span>
          <div className="flex gap-2 flex-wrap">
            {[
              { v: "diario", l: "Diário" },
              { v: "semanal", l: "Um dia da semana" },
              { v: "personalizado", l: "Vários dias" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => { setRegra(o.v as typeof regra); setDiasSel([]); }}
                className="px-3.5 py-2 rounded-full text-[12.5px] font-bold border"
                style={regra === o.v ? { background: ACCENT, borderColor: ACCENT, color: "#fff" } : { borderColor: "#E9E7F5", color: "#20233D" }}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {regra !== "diario" && (
          <div className="mb-3.5">
            <span className="block text-[12px] font-bold text-[#6E7091] mb-1.5">
              {regra === "semanal" ? "Qual dia?" : "Quais dias?"}
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {DIAS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => toggleDia(i)}
                  className="w-10 h-10 rounded-full text-[12px] font-bold border"
                  style={diasSel.includes(i) ? { background: ACCENT, borderColor: ACCENT, color: "#fff" } : { borderColor: "#E9E7F5", color: "#20233D" }}
                >
                  {d[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-2">
          <span className="block text-[12px] font-bold text-[#6E7091] mb-1.5">Atribuir a</span>
          <div className="flex gap-2 flex-wrap">
            {membros.map((m) => (
              <button
                key={m.id}
                onClick={() => setResponsavel(m.id)}
                className="px-3.5 py-2 rounded-full text-[12.5px] font-bold border"
                style={responsavel === m.id ? { background: ACCENT, borderColor: ACCENT, color: "#fff" } : { borderColor: "#E9E7F5", color: "#20233D" }}
              >
                {m.nome}
              </button>
            ))}
          </div>
        </div>

        {erro && <div className="text-[#B23B36] text-[13px] mt-3">{erro}</div>}

        <button onClick={salvar} disabled={salvando} className="w-full mt-5 py-3.5 rounded-2xl font-extrabold text-[15px] text-white disabled:opacity-60" style={{ background: ACCENT }}>
          {salvando ? "Salvando..." : "Salvar atividade"}
        </button>
      </div>
    </div>
  );
}

function SheetNovaCompra({
  membros,
  onFechar,
  onSalvo,
}: {
  membros: Profile[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState("");
  const [responsavel, setResponsavel] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) { setErro("Dê um nome pro item."); return; }
    setSalvando(true);
    setErro(null);
    try {
      await criarItemCompra({ nome: nome.trim(), responsavel });
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative bg-white w-full max-w-[460px] rounded-t-[24px] p-5 pb-[calc(24px+env(safe-area-inset-bottom))] max-h-[88vh] overflow-y-auto">
        <div className="w-10 h-1.5 rounded-full bg-[#E9E7F5] mx-auto mb-4" />
        <h3 className="text-[18px] font-extrabold mb-4">Novo item</h3>

        <label className="block mb-3.5">
          <span className="block text-[12px] font-bold text-[#6E7091] mb-1.5">O que precisa comprar?</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Café" className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-2.5 text-[14.5px] outline-none" />
        </label>

        <div className="mb-2">
          <span className="block text-[12px] font-bold text-[#6E7091] mb-1.5">Atribuir a (opcional)</span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setResponsavel(null)}
              className="px-3.5 py-2 rounded-full text-[12.5px] font-bold border"
              style={responsavel === null ? { background: ACCENT, borderColor: ACCENT, color: "#fff" } : { borderColor: "#E9E7F5", color: "#20233D" }}
            >
              Ninguém
            </button>
            {membros.map((m) => (
              <button
                key={m.id}
                onClick={() => setResponsavel(m.id)}
                className="px-3.5 py-2 rounded-full text-[12.5px] font-bold border"
                style={responsavel === m.id ? { background: ACCENT, borderColor: ACCENT, color: "#fff" } : { borderColor: "#E9E7F5", color: "#20233D" }}
              >
                {m.nome}
              </button>
            ))}
          </div>
        </div>

        {erro && <div className="text-[#B23B36] text-[13px] mt-3">{erro}</div>}

        <button onClick={salvar} disabled={salvando} className="w-full mt-5 py-3.5 rounded-2xl font-extrabold text-[15px] text-white disabled:opacity-60" style={{ background: ACCENT }}>
          {salvando ? "Salvando..." : "Adicionar"}
        </button>
      </div>
    </div>
  );
}
