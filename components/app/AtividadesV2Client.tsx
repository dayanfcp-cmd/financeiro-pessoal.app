"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import type { Activity, ActivityCompletion, ActivityOccurrenceOverride, Profile, ShoppingItem, Recorrencia, ActivityType } from "@/lib/types/database";
import { PainelAtividades } from "@/components/app/PainelAtividades";

const ACCENT = "#12A87A";
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const hojeISO = () => new Date().toISOString().slice(0, 10);
const vence = (a: Activity, d: number) => a.recorrencia === "diario" || (a.dias_semana ?? []).includes(d);

export function AtividadesV2Client({ meuId, householdId, membros, atividadesIniciais, conclusoesHojeIniciais, comprasIniciais }: {
  meuId:string; householdId:string; membros:Profile[]; atividadesIniciais:Activity[]; conclusoesHojeIniciais:ActivityCompletion[]; comprasIniciais:ShoppingItem[];
}) {
  const router = useRouter();
  const [aba,setAba] = useState<"hoje"|"semana"|"compras"|"painel">("hoje");
  const [atividades,setAtividades] = useState(atividadesIniciais);
  const [conclusoes,setConclusoes] = useState(conclusoesHojeIniciais);
  const [compras,setCompras] = useState(comprasIniciais);
  const [modal,setModal] = useState<"atividade"|"compra"|null>(null);
  const [editar,setEditar] = useState<Activity|null>(null);
  const [flex,setFlex] = useState<Activity|null>(null);
  const [salvando,setSalvando] = useState(false);
  const [adiantamentos,setAdiantamentos] = useState<ActivityOccurrenceOverride[]>([]);
  const supabase=createClient();
  const hoje=new Date().getDay();
  const hojeData=hojeISO();
  const movedFromToday=new Set(adiantamentos.filter(o=>o.original_date===hojeData).map(o=>o.activity_id));
  const movedToToday=new Set(adiantamentos.filter(o=>o.target_date===hojeData).map(o=>o.activity_id));
  const minhas=atividades.filter(a=>a.ativo&&a.responsavel===meuId&&((vence(a,hoje)&&!movedFromToday.has(a.id))||movedToToday.has(a.id)));
  const feitas=useMemo(()=>new Map(conclusoes.map(c=>[c.activity_id,c])),[conclusoes]);
  const pendentesCompra=compras.filter(i=>!i.comprado);
  const arquivadasCompra=compras.filter(i=>i.comprado);

  async function recarregar(){
    const [a,c,cp,o]=await Promise.all([
      supabase.from("activities").select("*").eq("household_id",householdId).eq("ativo",true).order("created_at"),
      supabase.from("activity_completions").select("*").eq("household_id",householdId).eq("data",hojeISO()),
      supabase.from("shopping_items").select("*").eq("household_id",householdId).order("created_at"),
      supabase.from("activity_occurrence_overrides").select("*").eq("household_id",householdId)
    ]);
    if(a.data)setAtividades(a.data as Activity[]);
    if(c.data)setConclusoes(c.data as ActivityCompletion[]);
    if(cp.data)setCompras(cp.data as ShoppingItem[]);
    if(o.data)setAdiantamentos(o.data as ActivityOccurrenceOverride[]);
  }

  useEffect(()=>{ recarregar(); },[]);

  function dataSemana(d:number){const x=new Date();x.setHours(12,0,0,0);x.setDate(x.getDate()-x.getDay()+d);return x.toISOString().slice(0,10);}
  async function adiantarTarefa(a:Activity, originalDay:number, targetDay:number){
    if(a.recorrencia==="diario"){alert("Tarefas diárias não podem ser adiantadas.");return;}
    if(originalDay===targetDay)return;
    const original_date=dataSemana(originalDay), target_date=dataSemana(targetDay);
    const {error}=await supabase.from("activity_occurrence_overrides").upsert({activity_id:a.id,household_id:householdId,original_date,target_date,created_by:meuId},{onConflict:"activity_id,original_date"});
    if(error){alert(`Não foi possível adiantar a tarefa: ${error.message}`);return;}
    await recarregar();
  }

  async function concluirNormal(a:Activity){
    const existente=feitas.get(a.id);
    if(existente) await supabase.from("activity_completions").delete().eq("id",existente.id);
    else await supabase.from("activity_completions").upsert({activity_id:a.id,household_id:householdId,data:hojeISO(),feito_por:meuId,validacao_resultado:null,verificado_em:null},{onConflict:"activity_id,data"});
    await recarregar();
  }
  async function registrarFlex(resultado:boolean){
    if(!flex)return; setSalvando(true);
    const {error}=await supabase.from("activity_completions").upsert({activity_id:flex.id,household_id:householdId,data:hojeISO(),feito_por:meuId,validacao_resultado:resultado,verificado_em:new Date().toISOString()},{onConflict:"activity_id,data"});
    setSalvando(false); if(error){alert("Não foi possível registrar a verificação.");return;} setFlex(null); await recarregar();
  }
  async function arquivarCompra(i:ShoppingItem){setCompras(p=>p.map(x=>x.id===i.id?{...x,comprado:true}:x));const {error}=await supabase.from("shopping_items").update({comprado:true}).eq("id",i.id);if(error)await recarregar();}
  async function desarquivarCompra(i:ShoppingItem){await supabase.from("shopping_items").update({comprado:false}).eq("id",i.id);await recarregar();}
  async function excluirCompra(id:string){await supabase.from("shopping_items").delete().eq("id",id);await recarregar();}
  async function excluirAtividade(id:string){if(!confirm("Excluir esta tarefa? Ela sairá da programação, mas o histórico será preservado."))return;await supabase.from("activities").update({ativo:false}).eq("id",id);await recarregar();}

  return <div className="min-h-screen bg-[var(--bg,#F5F4FB)] pb-24">
    <header className="px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-3 flex items-center gap-3">
      <button onClick={()=>router.push("/")} className="w-9 h-9 rounded-full bg-white border border-[#E9E7F5] grid place-items-center"><Icon name="chev" className="w-4 h-4 rotate-180 text-[#6E7091]"/></button>
      <h1 className="text-[19px] font-extrabold tracking-tight">{aba==="hoje"?"Hoje":aba==="semana"?"Semana":aba==="compras"?"Lista de compras":"Painel"}</h1>
    </header>
    <main className="px-5 md:max-w-[680px] md:mx-auto">
      {aba==="hoje"&&<>
        <SectionTitle text="Suas tarefas de hoje" meta={`${minhas.filter(a=>a.tipo==="flex"?feitas.get(a.id)?.validacao_resultado===true:!!feitas.get(a.id)).length}/${minhas.length}`}/>
        <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)] px-4">
          {minhas.length===0?<Empty text="Nada atribuído a você hoje"/>:minhas.map(a=>{const c=feitas.get(a.id);const realizado=a.tipo==="flex"?c?.validacao_resultado===true:!!c;return <div key={a.id} className="py-3 border-b border-[#E9E7F5] last:border-0 flex items-center gap-3">{a.tipo==="flex"?<button onClick={()=>setFlex(a)} aria-label={realizado?"Verificação concluída":"Verificar condição"} className={`w-7 h-7 rounded-xl border-2 grid place-items-center flex-none active:scale-95 transition ${realizado?"border-[#12A87A] bg-[#E8FAF4]":"border-[#F0B429] bg-[#FFF8E8]"}`}>{realizado?<Icon name="check" className="w-3.5 h-3.5 text-[#12A87A]"/>:<span className="text-[11px] font-black text-[#B57900]">?</span>}</button>:<button onClick={()=>concluirNormal(a)} className={`w-6 h-6 rounded-lg border-2 grid place-items-center flex-none ${realizado?"bg-[#12A87A] border-[#12A87A]":"bg-white border-[#E9E7F5]"}`}>{realizado&&<Icon name="check" className="w-3.5 h-3.5 text-white"/>}</button>}<button onClick={()=>a.tipo==="flex"?setFlex(a):concluirNormal(a)} className="flex-1 min-w-0 text-left"><div className={`text-[14.5px] font-semibold ${realizado?"line-through text-[#6E7091]":""}`}>{a.nome}</div><div className="text-[11.5px] text-[#6E7091] mt-0.5">{a.tipo==="flex"?(c?(c.validacao_resultado?"Verificação: condição verdadeira · contabilizada":"Verificação: condição falsa · não contabilizada"):"Verificação pendente"):(a.recorrencia==="diario"?"todo dia":"programada")}</div></button><button aria-label={`Editar ${a.nome}`} onClick={()=>setEditar(a)} className="w-8 h-8 rounded-full grid place-items-center text-[#6E7091] hover:bg-[#F3F2F8] active:scale-90 transition"><span className="text-[17px]">✎</span></button><button onClick={()=>excluirAtividade(a.id)} className="text-[11px] text-[#F0616D] font-semibold">Excluir</button></div>})}
        </div>
        <SectionTitle text="Lista de compras" meta={`${pendentesCompra.length} pendente${pendentesCompra.length===1?"":"s"}`} className="mt-7"/>
        <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)] px-4">{pendentesCompra.length?pendentesCompra.map(i=><ShoppingRow key={i.id} item={i} onArchive={()=>arquivarCompra(i)} onDelete={()=>excluirCompra(i.id)}/>):<Empty text="Nenhum item pendente"/>}</div>
      </>}
      {aba==="semana"&&<Semana atividades={atividades} membros={membros} adiantamentos={adiantamentos} onEdit={setEditar} onAdvance={adiantarTarefa}/>} 
      {aba==="compras"&&<><div className="flex items-center justify-between mb-2"><SectionTitle text="Itens para comprar" meta={`${pendentesCompra.length}`}/><button onClick={()=>setModal("compra")} className="text-[12px] font-extrabold text-[#12A87A]">+ Adicionar</button></div><div className="bg-white rounded-[20px] px-4 shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)]">{pendentesCompra.length?pendentesCompra.map(i=><ShoppingRow key={i.id} item={i} onArchive={()=>arquivarCompra(i)} onDelete={()=>excluirCompra(i.id)}/>):<Empty text="Sua lista está vazia"/>}</div><div className="mt-7 text-[13px] font-bold text-[#6E7091] mb-2">Arquivados</div><div className="bg-white rounded-[20px] px-4 shadow-sm">{arquivadasCompra.length?arquivadasCompra.map(i=><div key={i.id} className="flex items-center gap-3 py-3 border-b border-[#E9E7F5] last:border-0"><div className="flex-1"><div className="text-[14px] font-semibold line-through text-[#6E7091]">{i.nome}</div><div className="text-[11px] text-[#9A9BB0]">Comprado / arquivado</div></div><button onClick={()=>desarquivarCompra(i)} className="text-[11px] font-bold text-[#6E7091]">Reabrir</button></div>):<Empty text="Nenhum item arquivado"/>}</div></>}
      {aba==="painel"&&<PainelAtividades meuId={meuId} householdId={householdId} membros={membros}/>} 
    </main>
    <nav className="fixed left-0 right-0 bottom-0 z-30 h-[calc(60px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-white border-t border-[#E9E7F5] flex max-w-[460px] mx-auto md:max-w-[680px]"><Tab icon="calendario" label="Hoje" active={aba==="hoje"} onClick={()=>setAba("hoje")}/><Tab icon="calendario" label="Semana" active={aba==="semana"} onClick={()=>setAba("semana")}/><div className="flex-1 grid place-items-center"><button aria-label="Nova tarefa" onClick={()=>setModal(aba==="compras"?"compra":"atividade")} className="relative -top-3 w-[52px] h-[52px] rounded-full text-white grid place-items-center shadow-lg active:scale-95 transition" style={{background:ACCENT}}><Icon name="plus" className="w-6 h-6"/></button></div><Tab icon="carrinho" label="Compras" active={aba==="compras"} onClick={()=>setAba("compras")}/><Tab icon="painel" label="Painel" active={aba==="painel"} onClick={()=>setAba("painel")}/></nav>
    {modal==="atividade"&&<NovaAtividade membros={membros} onClose={()=>setModal(null)} onSaved={recarregar}/>} 
    {modal==="compra"&&<NovaCompra membros={membros} meuId={meuId} onClose={()=>setModal(null)} onSaved={recarregar}/>} 
    {editar&&<EditarAtividade atividade={editar} membros={membros} onClose={()=>setEditar(null)} onSaved={async()=>{setEditar(null);await recarregar();}}/>}
    {flex&&<FlexModal activity={flex} completion={feitas.get(flex.id)} busy={salvando} onClose={()=>setFlex(null)} onResult={registrarFlex}/>} 
  </div>;
}

function SectionTitle({text,meta,className=""}:{text:string;meta?:string;className?:string}){return <div className={`flex items-baseline justify-between mb-2 px-1 ${className}`}><span className="text-[13px] font-bold text-[#6E7091]">{text}</span>{meta&&<span className="text-[12px] text-[#6E7091]">{meta}</span>}</div>}
function Empty({text}:{text:string}){return <div className="text-center text-[13px] text-[#6E7091] py-10">{text}</div>}
function Metric({label,value}:{label:string;value:string}){return <div className="bg-white rounded-[18px] p-4 shadow-sm"><div className="text-[26px] font-black tracking-tight">{value}</div><div className="text-[11px] text-[#6E7091] mt-1">{label}</div></div>}
function Tab({icon,label,active,onClick}:{icon:string;label:string;active:boolean;onClick:()=>void}){return <button onClick={onClick} className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition active:scale-95" style={{color:active?ACCENT:"#9A9BB0"}}><Icon name={icon} className="w-5 h-5"/><span>{label}</span></button>}

function ShoppingRow({item,onArchive,onDelete}:{item:ShoppingItem;onArchive:()=>void;onDelete:()=>void}){return <div className="flex items-center gap-3 py-3 border-b border-[#E9E7F5] last:border-0"><button onClick={onArchive} className="w-6 h-6 rounded-lg border-2 border-[#E9E7F5] flex-none"/><div className="flex-1 min-w-0"><div className="text-[14px] font-semibold">{item.nome}</div><div className="text-[11px] text-[#6E7091]">{item.responsavel?"Atribuído":"Sem responsável"}</div></div><button onClick={onDelete} className="text-[11px] text-[#F0616D] font-semibold">Excluir</button></div>}

function Semana({atividades,membros,adiantamentos,onEdit,onAdvance}:{atividades:Activity[];membros:Profile[];adiantamentos:ActivityOccurrenceOverride[];onEdit:(a:Activity)=>void;onAdvance:(a:Activity,o:number,t:number)=>void}){const [dia,setDia]=useState(new Date().getDay());const movedIn=adiantamentos.filter(o=>o.target_date===dataDia(dia)).map(o=>o.activity_id);const movedOut=adiantamentos.filter(o=>o.original_date===dataDia(dia)).map(o=>o.activity_id);const lista=atividades.filter(a=>a.ativo&&((vence(a,dia)&&!movedOut.includes(a.id))||movedIn.includes(a.id)));return <><div className="grid grid-cols-7 gap-1.5 mb-4">{DIAS.map((d,i)=><button key={d} onClick={()=>setDia(i)} className="rounded-xl py-2 bg-white shadow-sm" style={{border:dia===i?`2px solid ${ACCENT}`:"2px solid transparent"}}><div className="text-[9.5px] font-bold text-[#6E7091]">{d}</div></button>)}</div><div className="bg-white rounded-[20px] px-4 shadow-sm">{lista.length?lista.map(a=><div key={a.id} className="py-3 border-b border-[#E9E7F5] last:border-0 flex items-center gap-2"><div className="flex-1 min-w-0"><div className="text-[14px] font-semibold">{a.nome}</div><div className="text-[11px] text-[#6E7091]">{a.tipo==="flex"?"Flex · validação":"Tarefa"} · {membros.find(m=>m.id===a.responsavel)?.nome||"sem responsável"}</div></div><button aria-label={`Editar ${a.nome}`} onClick={()=>onEdit(a)} className="w-9 h-9 rounded-full grid place-items-center text-[#6E7091] hover:bg-[#F3F2F8] active:scale-90 transition text-[18px]">✎</button>{a.recorrencia!=="diario"&&<button onClick={()=>onAdvance(a,dia,((dia+1)%7))} className="px-2.5 py-2 rounded-xl bg-[#F3F2F8] text-[10px] font-extrabold text-[#6E7091] active:scale-95">Adiantar</button>}</div>):<Empty text="Nada nesse dia"/>}</div></>}
function dataDia(d:number){const x=new Date();x.setHours(12,0,0,0);x.setDate(x.getDate()-x.getDay()+d);return x.toISOString().slice(0,10)}

function NovaAtividade({membros,onClose,onSaved}:{membros:Profile[];onClose:()=>void;onSaved:()=>void}){const [nome,setNome]=useState("");const [responsavel,setResponsavel]=useState(membros[0]?.id||"");const [tipo,setTipo]=useState<ActivityType>("normal");const [condicao,setCondicao]=useState("");const [recorrencia,setRecorrencia]=useState<Recorrencia>("diario");const [dias,setDias]=useState<number[]>([1,2,3,4,5]);const [salvando,setSalvando]=useState(false);const supabase=createClient();const salvar=async()=>{if(!nome.trim())return;setSalvando(true);const {error}=await supabase.from("activities").insert({nome:nome.trim(),responsavel,tipo,condicao:tipo==="flex"?condicao.trim():null,recorrencia,dias_semana:recorrencia==="personalizado"?dias:null,ativo:true});setSalvando(false);if(error){alert(error.message);return}onSaved();onClose()};return <div className="fixed inset-0 z-40 flex items-end justify-center"><div className="absolute inset-0 bg-black/40" onClick={onClose}/><div className="relative bg-white w-full max-w-[460px] rounded-t-[24px] p-5 pb-[calc(24px+env(safe-area-inset-bottom))] max-h-[88vh] overflow-y-auto"><div className="w-10 h-1.5 rounded-full bg-[#E9E7F5] mx-auto mb-4"/><h3 className="text-[18px] font-extrabold mb-4">Nova tarefa</h3><input value={nome} onChange={e=>setNome(e.target.value)} placeholder="O que precisa ser feito?" className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-3 mb-3 text-[14.5px]"/><select value={responsavel} onChange={e=>setResponsavel(e.target.value)} className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-3 mb-3 text-[14px]">{membros.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}</select><div className="grid grid-cols-2 gap-2 mb-3"><button onClick={()=>setTipo("normal")} className={`py-3 rounded-xl font-bold ${tipo==="normal"?"bg-[#E8FAF4] text-[#0B7A57]":"bg-[#F3F2F8] text-[#6E7091]"}`}>Tarefa normal</button><button onClick={()=>setTipo("flex")} className={`py-3 rounded-xl font-bold ${tipo==="flex"?"bg-[#E8FAF4] text-[#0B7A57]":"bg-[#F3F2F8] text-[#6E7091]"}`}>Flex · validação</button></div>{tipo==="flex"&&<input value={condicao} onChange={e=>setCondicao(e.target.value)} placeholder="Condição para contabilizar" className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-3 mb-3 text-[14px]"/>}<div className="mb-3"><div className="text-[12px] font-bold text-[#6E7091] mb-2">Programação</div><div className="grid grid-cols-3 gap-2">{([["diario","Todos os dias"],["semanal","Semanal"],["personalizado","Dias selecionados"]] as [Recorrencia,string][]).map(([v,l])=><button key={v} onClick={()=>setRecorrencia(v)} className={`py-2.5 rounded-xl text-[11px] font-extrabold ${recorrencia===v?"bg-[#12A87A] text-white":"bg-[#F3F2F8] text-[#6E7091]"}`}>{l}</button>)}</div>{recorrencia!=="diario"&&<div className="grid grid-cols-7 gap-1 mt-2">{DIAS.map((d,i)=><button key={d} onClick={()=>setDias(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i])} className={`py-2 rounded-lg text-[10px] font-bold ${dias.includes(i)?"bg-[#E8FAF4] text-[#0B7A57]":"bg-[#F3F2F8] text-[#6E7091]"}`}>{d}</button>)}</div>}</div><button onClick={salvar} disabled={salvando} className="w-full py-3.5 rounded-2xl bg-[#CF8A1C] text-white font-extrabold disabled:opacity-60">{salvando?"Criando...":"Criar tarefa"}</button></div></div>}

function FlexModal({activity,completion,busy,onClose,onResult}:{activity:Activity;completion?:ActivityCompletion;busy:boolean;onClose:()=>void;onResult:(r:boolean)=>void}){return <div className="fixed inset-0 z-50 flex items-end justify-center"><div className="absolute inset-0 bg-black/40" onClick={onClose}/><div className="relative bg-white w-full max-w-[460px] rounded-t-[24px] p-5"><div className="w-10 h-1.5 rounded-full bg-[#E9E7F5] mx-auto mb-4"/><h3 className="text-[18px] font-extrabold">{activity.nome}</h3><div className="mt-3 bg-[#F8F7FC] rounded-2xl p-4"><div className="text-[12px] font-bold text-[#6E7091]">Condição</div><div className="text-[14px] mt-1">{activity.condicao||"Verificar a condição"}</div></div><div className="grid grid-cols-2 gap-2 mt-4"><button onClick={()=>onResult(true)} disabled={busy} className="py-3 rounded-xl bg-[#E8FAF4] text-[#0B7A57] font-extrabold">Sim, é verdadeira</button><button onClick={()=>onResult(false)} disabled={busy} className="py-3 rounded-xl bg-[#FFF3F0] text-[#B23B36] font-extrabold">Não, é falsa</button></div>{completion&&<div className="text-[11px] text-[#6E7091] mt-3">Última verificação: {completion.validacao_resultado?"verdadeira · contabilizada":"falsa · não contabilizada"}</div>}</div></div>}

function EditarAtividade({atividade,membros,onClose,onSaved}:{atividade:Activity;membros:Profile[];onClose:()=>void;onSaved:()=>void}){const [nome,setNome]=useState(atividade.nome);const [responsavel,setResponsavel]=useState(atividade.responsavel||"");const [tipo,setTipo]=useState<ActivityType>(atividade.tipo);const [condicao,setCondicao]=useState(atividade.condicao||"");const [recorrencia,setRecorrencia]=useState<Recorrencia>(atividade.recorrencia);const [dias,setDias]=useState<number[]>(atividade.dias_semana||[]);const [salvando,setSalvando]=useState(false);const supabase=createClient();const salvar=async()=>{if(!nome.trim())return;setSalvando(true);const {error}=await supabase.from("activities").update({nome:nome.trim(),responsavel,tipo,condicao:tipo==="flex"?condicao.trim():null,recorrencia,dias_semana:recorrencia==="personalizado"?dias:null}).eq("id",atividade.id);setSalvando(false);if(error){alert(error.message);return}onSaved()};return <div className="fixed inset-0 z-40 flex items-end justify-center"><div className="absolute inset-0 bg-black/40" onClick={onClose}/><div className="relative bg-white w-full max-w-[460px] rounded-t-[24px] p-5 max-h-[88vh] overflow-y-auto"><div className="w-10 h-1.5 rounded-full bg-[#E9E7F5] mx-auto mb-4"/><h3 className="text-[18px] font-extrabold mb-4">Editar tarefa</h3><input value={nome} onChange={e=>setNome(e.target.value)} className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-3 mb-3"/><select value={responsavel} onChange={e=>setResponsavel(e.target.value)} className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-3 mb-3">{membros.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}</select><div className="grid grid-cols-2 gap-2 mb-3"><button onClick={()=>setTipo("normal")} className={`py-3 rounded-xl font-bold ${tipo==="normal"?"bg-[#E8FAF4] text-[#0B7A57]":"bg-[#F3F2F8] text-[#6E7091]"}`}>Tarefa normal</button><button onClick={()=>setTipo("flex")} className={`py-3 rounded-xl font-bold ${tipo==="flex"?"bg-[#E8FAF4] text-[#0B7A57]":"bg-[#F3F2F8] text-[#6E7091]"}>Flex · validação</button></div>{tipo==="flex"&&<input value={condicao} onChange={e=>setCondicao(e.target.value)} placeholder="Condição" className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-3 mb-3"/>}<div className="text-[12px] font-bold text-[#6E7091] mb-2">Programação</div><div className="grid grid-cols-3 gap-2 mb-2">{([["diario","Todos os dias"],["semanal","Semanal"],["personalizado","Dias selecionados"]] as [Recorrencia,string][]).map(([v,l])=><button key={v} onClick={()=>setRecorrencia(v)} className={`py-2.5 rounded-xl text-[11px] font-extrabold ${recorrencia===v?"bg-[#12A87A] text-white":"bg-[#F3F2F8] text-[#6E7091]"}`}>{l}</button>)}</div>{recorrencia!=="diario"&&<div className="grid grid-cols-7 gap-1 mb-3">{DIAS.map((d,i)=><button key={d} onClick={()=>setDias(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i])} className={`py-2 rounded-lg text-[10px] font-bold ${dias.includes(i)?"bg-[#E8FAF4] text-[#0B7A57]":"bg-[#F3F2F8] text-[#6E7091]"}`}>{d}</button>)}</div>}<button onClick={salvar} disabled={salvando} className="w-full py-3.5 rounded-2xl bg-[#CF8A1C] text-white font-extrabold">{salvando?"Salvando...":"Salvar alterações"}</button></div></div>}
