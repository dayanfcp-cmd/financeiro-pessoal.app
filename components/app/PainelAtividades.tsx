"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Activity, ActivityCompletion, Profile } from "@/lib/types/database";

const hoje = () => new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const inicioSemana = () => { const d = hoje(); d.setHours(12,0,0,0); d.setDate(d.getDate()-d.getDay()); return d; };
const fimSemana = () => { const d = inicioSemana(); d.setDate(d.getDate()+6); return d; };
const venceNoDia = (a: Activity, dia: number) => a.recorrencia === "diario" || (a.dias_semana ?? []).includes(dia);

export function PainelAtividades({ meuId, householdId, membros }: { meuId: string; householdId: string; membros: Profile[] }) {
  const supabase = createClient();
  const [atividades, setAtividades] = useState<Activity[]>([]);
  const [conclusoes, setConclusoes] = useState<ActivityCompletion[]>([]);
  const [filtro, setFiltro] = useState<string>("todos");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true); setErro(null);
    const ini = iso(inicioSemana());
    const fim = iso(fimSemana());
    const [a,c] = await Promise.all([
      supabase.from("activities").select("*").eq("household_id", householdId).eq("ativo", true),
      supabase.from("activity_completions").select("*").eq("household_id", householdId).gte("data", ini).lte("data", fim)
    ]);
    if (a.error) setErro(`Tarefas: ${a.error.message}`);
    if (c.error) setErro(`Histórico: ${c.error.message}`);
    setAtividades((a.data ?? []) as Activity[]);
    setConclusoes((c.data ?? []) as ActivityCompletion[]);
    setCarregando(false);
  }
  useEffect(() => { carregar(); }, [householdId]);

  const porPessoa = useMemo(() => membros.map(p => {
    const minhas = atividades.filter(a => a.responsavel === p.id);
    let total = 0, realizadas = 0;
    for (let dia=0; dia<7; dia++) {
      for (const a of minhas) {
        if (!venceNoDia(a,dia)) continue;
        total++;
        const data = new Date(inicioSemana()); data.setDate(data.getDate()+dia);
        const c = conclusoes.find(x => x.activity_id === a.id && x.data === iso(data));
        const ok = a.tipo === "flex" ? c?.validacao_resultado === true : !!c;
        if (ok) realizadas++;
      }
    }
    return { p, total, realizadas, pendentes: Math.max(0,total-realizadas) };
  }), [membros, atividades, conclusoes]);

  const exibidos = filtro === "todos" ? porPessoa : porPessoa.filter(x => x.p.id === filtro);
  const geral = exibidos.reduce((s,x)=>({total:s.total+x.total,realizadas:s.realizadas+x.realizadas}),{total:0,realizadas:0});
  const percentual = geral.total ? Math.round((geral.realizadas/geral.total)*100) : 0;
  const meuResumo = porPessoa.find(x=>x.p.id===meuId);
  const annaResumo = porPessoa.find(x=>x.p.nome.trim().toLocaleLowerCase()==="anna");

  return <div className="space-y-4">
    <div className="flex items-center justify-between px-1"><div><div className="text-[15px] font-extrabold text-[#20202D]">Atividades da casa</div><div className="text-[11px] text-[#9A9BB0]">Resumo da semana · {carregando ? "carregando..." : `${percentual}% realizado`}</div></div><button onClick={carregar} className="px-3 py-2 rounded-xl bg-[#E8FAF4] text-[11px] font-extrabold text-[#087A58] active:scale-95">Atualizar</button></div>

    <div className="grid grid-cols-2 gap-3">
      <ResumoDestaque titulo="Minhas atividades" nome={meuResumo?.p.nome || "Você"} total={meuResumo?.total || 0} realizadas={meuResumo?.realizadas || 0} />
      <ResumoDestaque titulo="Atividades da Anna" nome={annaResumo?.p.nome || "Anna"} total={annaResumo?.total || 0} realizadas={annaResumo?.realizadas || 0} />
    </div>

    <div className="flex gap-2 overflow-x-auto pb-1"><button onClick={()=>setFiltro("todos")} className={`px-3 py-2 rounded-xl text-[11px] font-extrabold whitespace-nowrap ${filtro==="todos"?"bg-[#12A87A] text-white":"bg-white text-[#6E7091] border border-[#E9E7F5]"}`}>Todos</button>{membros.map(p=><button key={p.id} onClick={()=>setFiltro(p.id)} className={`px-3 py-2 rounded-xl text-[11px] font-extrabold whitespace-nowrap ${filtro===p.id?"bg-[#12A87A] text-white":"bg-white text-[#6E7091] border border-[#E9E7F5]"}`}>{p.nome}</button>)}</div>

    <div className="grid grid-cols-2 gap-3"><Metric label="Total de tarefas" value={String(geral.total)}/><Metric label="Realizadas" value={String(geral.realizadas)} accent/><Metric label="Pendentes" value={String(Math.max(0,geral.total-geral.realizadas))}/><Metric label="Aproveitamento" value={`${percentual}%`} accent/></div>
    <div className="text-[13px] font-bold text-[#6E7091] px-1">Detalhamento por usuário</div>
    <div className="bg-white rounded-[20px] px-4 shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)]">{exibidos.map(({p,total,realizadas,pendentes})=><div key={p.id} className="py-4 border-b border-[#E9E7F5] last:border-0"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full overflow-hidden bg-[#ECE8FF] grid place-items-center text-[#6C4BF4] font-extrabold">{p.avatar_url?<img src={p.avatar_url} alt={p.nome} className="w-full h-full object-cover"/>:p.nome.charAt(0).toUpperCase()}</div><div className="flex-1"><div className="text-[14px] font-extrabold">{p.nome}</div><div className="text-[11px] text-[#6E7091]">{realizadas} realizadas de {total}</div></div><div className="text-right"><div className="text-[17px] font-black text-[#12A87A]">{realizadas}/{total}</div><div className="text-[10px] text-[#9A9BB0]">{pendentes} pendentes</div></div></div><div className="mt-3 h-2 rounded-full bg-[#F0EFF6] overflow-hidden"><div className="h-full rounded-full bg-[#12A87A]" style={{width:`${total?Math.round(realizadas/total*100):0}%`}}/></div></div>)}{!exibidos.length&&<div className="py-10 text-center text-[13px] text-[#6E7091]">Nenhum usuário encontrado.</div>}</div>
    {erro&&<div className="rounded-2xl bg-[#FFF3F0] border border-[#F3C4BF] p-3 text-[11px] text-[#B23B36]">{erro}</div>}
    <div className="text-[11px] text-[#9A9BB0] px-1">Flex só conta como realizada quando a validação é verdadeira. A verificação falsa permanece registrada e não aumenta o total realizado.</div>
  </div>;
}
function ResumoDestaque({titulo,nome,total,realizadas}:{titulo:string;nome:string;total:number;realizadas:number}){const pct=total?Math.round(realizadas/total*100):0;return <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)]"><div className="text-[11px] font-extrabold text-[#6E7091]">{titulo}</div><div className="text-[15px] font-black mt-1">{nome}</div><div className="text-[25px] font-black text-[#12A87A] mt-2">{realizadas}<span className="text-[15px] text-[#9A9BB0]">/{total}</span></div><div className="text-[10px] text-[#6E7091]">realizadas / total</div><div className="mt-2 h-1.5 rounded-full bg-[#F0EFF6] overflow-hidden"><div className="h-full rounded-full bg-[#12A87A]" style={{width:`${pct}%`}}/></div></div>}
function Metric({label,value,accent=false}:{label:string;value:string;accent?:boolean}){return <div className="bg-white rounded-[18px] p-4 shadow-sm"><div className="text-[11px] font-semibold text-[#6E7091]">{label}</div><div className={`text-[24px] font-black mt-1 ${accent?"text-[#12A87A]":"text-[#20202D]"}`}>{value}</div></div>}
