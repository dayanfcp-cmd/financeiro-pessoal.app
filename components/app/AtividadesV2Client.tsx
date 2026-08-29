"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import type { Activity, ActivityCompletion, ActivityOccurrenceOverride, Profile, ShoppingItem, Recorrencia, ActivityType } from "@/lib/types/database";

const ACCENT = "#12A87A";
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const hojeISO = () => new Date().toISOString().slice(0, 10);
const vence = (a: Activity, d: number) => a.recorrencia === "diario" || (a.dias_semana ?? []).includes(d);

export function AtividadesV2Client({ meuId, membros, atividadesIniciais, conclusoesHojeIniciais, comprasIniciais }: {
  meuId:string; membros:Profile[]; atividadesIniciais:Activity[]; conclusoesHojeIniciais:ActivityCompletion[]; comprasIniciais:ShoppingItem[];
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
      supabase.from("activities").select("*").eq("ativo",true).order("created_at"),
      supabase.from("activity_completions").select("*").eq("data",hojeISO()),
      supabase.from("shopping_items").select("*").order("created_at"),
      supabase.from("activity_occurrence_overrides").select("*")
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
    if(originalDay===targetDay){return;}
    const original_date=dataSemana(originalDay), target_date=dataSemana(targetDay);
    const {error}=await supabase.from("activity_occurrence_overrides").upsert({activity_id:a.id,original_date,target_date,created_by:meuId},{onConflict:"activity_id,original_date"});
    if(error){alert(`Não foi possível adiantar a tarefa: ${error.message}`);return;}
    await recarregar();
  }

  async function concluirNormal(a:Activity){
    const existente=feitas.get(a.id);
    if(existente) await supabase.from("activity_completions").delete().eq("id",existente.id);
    else await supabase.from("activity_completions").upsert({activity_id:a.id,data:hojeISO(),feito_por:meuId,validacao_resultado:null,verificado_em:null},{onConflict:"activity_id,data"});
    await recarregar();
  }
  async function registrarFlex(resultado:boolean){
    if(!flex)return; setSalvando(true);
    const {error}=await supabase.from("activity_completions").upsert({activity_id:flex.id,data:hojeISO(),feito_por:meuId,validacao_resultado:resultado,verificado_em:new Date().toISOString()},{onConflict:"activity_id,data"});
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
          {minhas.length===0?<Empty text="Nada atribuído a você hoje"/>:minhas.map(a=>{
            const c=feitas.get(a.id);const realizado=a.tipo==="flex"?c?.validacao_resultado===true:!!c;
            return <div key={a.id} className="py-3 border-b border-[#E9E7F5] last:border-0 flex items-center gap-3">
              {a.tipo==="flex"?<button onClick={()=>setFlex(a)} className="w-7 h-7 rounded-xl border-2 border-[#F0B429] bg-[#FFF8E8] grid place-items-center flex-none active:scale-95 transition"><span className="text-[11px] font-black text-[#B57900]">?</span></button>:<button onClick={()=>concluirNormal(a)} className={`w-6 h-6 rounded-lg border-2 grid place-items-center flex-none ${realizado?"bg-[#12A87A] border-[#12A87A]":"bg-white border-[#E9E7F5]"}`}>{realizado&&<Icon name="check" className="w-3.5 h-3.5 text-white"/>}</button>}
              <button onClick={()=>a.tipo==="flex"?setFlex(a):concluirNormal(a)} className="flex-1 min-w-0 text-left">
                <div className={`text-[14.5px] font-semibold ${realizado?"line-through text-[#6E7091]":""}`}>{a.nome}</div>
                <div className="text-[11.5px] text-[#6E7091] mt-0.5">{a.tipo==="flex"?(c?(c.validacao_resultado?"Verificação: condição verdadeira · contabilizada":"Verificação: condição falsa · não contabilizada"):"Verificação pendente"):(a.recorrencia==="diario"?"todo dia":"programada")}</div>
              </button>
              <button aria-label={`Editar ${a.nome}`} onClick={()=>setEditar(a)} className="w-8 h-8 rounded-full grid place-items-center text-[#6E7091] hover:bg-[#F3F2F8] active:scale-90 transition"><span className="text-[17px]">✎</span></button>
              <button onClick={()=>excluirAtividade(a.id)} className="text-[11px] text-[#F0616D] font-semibold">Excluir</button>
            </div>;
          })}
        </div>
        <SectionTitle text="Lista de compras" meta={`${pendentesCompra.length} pendente${pendentesCompra.length===1?"":"s"}`} className="mt-7"/>
        <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)] px-4">{pendentesCompra.length?pendentesCompra.map(i=><ShoppingRow key={i.id} item={i} onArchive={()=>arquivarCompra(i)} onDelete={()=>excluirCompra(i.id)}/>):<Empty text="Nenhum item pendente"/>}</div>
      </>}
      {aba==="semana"&&<Semana atividades={atividades} membros={membros} adiantamentos={adiantamentos} onEdit={setEditar} onAdvance={adiantarTarefa}/>} 
      {aba==="compras"&&<>
        <div className="flex items-center justify-between mb-2"><SectionTitle text="Itens para comprar" meta={`${pendentesCompra.length}`}/><button onClick={()=>setModal("compra")} className="text-[12px] font-extrabold text-[#12A87A]">+ Adicionar</button></div>
        <div className="bg-white rounded-[20px] px-4 shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)]">{pendentesCompra.length?pendentesCompra.map(i=><ShoppingRow key={i.id} item={i} onArchive={()=>arquivarCompra(i)} onDelete={()=>excluirCompra(i.id)}/>):<Empty text="Sua lista está vazia"/>}</div>
        <div className="mt-7 text-[13px] font-bold text-[#6E7091] mb-2">Arquivados</div>
        <div className="bg-white rounded-[20px] px-4 shadow-sm">{arquivadasCompra.length?arquivadasCompra.map(i=><div key={i.id} className="flex items-center gap-3 py-3 border-b border-[#E9E7F5] last:border-0"><div className="flex-1"><div className="text-[14px] font-semibold line-through text-[#6E7091]">{i.nome}</div><div className="text-[11px] text-[#9A9BB0]">Comprado / arquivado</div></div><button onClick={()=>desarquivarCompra(i)} className="text-[11px] font-bold text-[#6E7091]">Reabrir</button></div>):<Empty text="Nenhum item arquivado"/>}</div>
      </>}
      {aba==="painel"&&<><SectionTitle text="Painel" meta="histórico"/><div className="grid grid-cols-2 gap-3 mb-6"><Metric label="Verificações" value={String(conclusoes.filter(c=>c.verificado_em).length)}/><Metric label="Contabilizadas" value={String(conclusoes.filter(c=>c.validacao_resultado===true).length)}/></div><div className="text-[13px] font-bold text-[#6E7091] mb-2">Compras arquivadas</div><div className="bg-white rounded-[20px] px-4 shadow-sm">{arquivadasCompra.length?arquivadasCompra.map(i=><div key={i.id} className="py-3 border-b border-[#E9E7F5] last:border-0 text-[14px] font-semibold text-[#6E7091]">{i.nome}</div>):<Empty text="Nenhuma compra arquivada"/>}</div></>}
    </main>
    <nav className="fixed left-0 right-0 bottom-0 z-30 h-[calc(60px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-white border-t border-[#E9E7F5] flex max-w-[460px] mx-auto md:max-w-[680px]">
      <Tab icon="calendario" label="Hoje" active={aba==="hoje"} onClick={()=>setAba("hoje")}/><Tab icon="calendario" label="Semana" active={aba==="semana"} onClick={()=>setAba("semana")}/><div className="flex-1 grid place-items-center"><button aria-label="Nova tarefa" onClick={()=>setModal(aba==="compras"?"compra":"atividade")} className="relative -top-3 w-[52px] h-[52px] rounded-full text-white grid place-items-center shadow-lg active:scale-95 transition" style={{background:ACCENT}}><Icon name="plus" className="w-6 h-6"/></button></div><Tab icon="carrinho" label="Compras" active={aba==="compras"} onClick={()=>setAba("compras")}/><Tab icon="painel" label="Painel" active={aba==="painel"} onClick={()=>setAba("painel")}/>
    </nav>
    {modal==="atividade"&&<NovaAtividade membros={membros} onClose={()=>setModal(null)} onSaved={recarregar}/>} 
    {modal==="compra"&&<NovaCompra membros={membros} meuId={meuId} onClose={()=>setModal(null)} onSaved={recarregar}/>} 
    {editar&&<EditarAtividade atividade={editar} membros={membros} onClose={()=>setEditar(null)} onSaved={async()=>{setEditar(null);await recarregar();}}/>}
    {flex&&<FlexModal activity={flex} completion={feitas.get(flex.id)} busy={salvando} onClose={()=>setFlex(null)} onResult={registrarFlex}/>} 
  </div>;
}

function SectionTitle({text,meta,className=""}:{text:string;meta?:string;className?:string}){return <div className={`flex items-baseline justify-between mb-2 px-1 ${className}`}><span className="text-[13px] font-bold text-[#6E7091]">{text}</span>{meta&&<span className="text-[12px] text-[#6E7091]">{meta}</span>}</div>}
function Empty({text}:{text:string}){return <div className="text-center text-[13px] text-[#6E7091] py-10">{text}</div>}
function Metric({label,value}:{label:string;value:string}){return <div className="bg-white rounded-[18px] p-4 shadow-sm"><div className="text-[26px] font-black tracking-tight">{value}</div><div className="text-[11px] text-[#6E7091] mt-1">{label}</div></div>}
function Tab({icon,label,active,onClick}:{icon:string;label:string;active:boolean;onClick:()=>void}){return <button onClick={onClick} className="flex-1 flex flex-col items-center justify-center gap-1 pt-1" style={{color:active?ACCENT:"#6E7091"}}><Icon name={icon} className="w-5 h-5"/><span className="text-[10px] font-bold">{label}</span></button>}
function ShoppingRow({item,onArchive,onDelete}:{item:ShoppingItem;onArchive:()=>void;onDelete:()=>void}){return <div className="flex items-center gap-3 py-3 border-b border-[#E9E7F5] last:border-0"><button onClick={onArchive} className="w-6 h-6 rounded-lg border-2 border-[#E9E7F5] bg-white grid place-items-center flex-none hover:border-[#12A87A] active:scale-95 transition" aria-label="Arquivar como comprado"></button><div className="flex-1 min-w-0"><div className="text-[14.5px] font-semibold">{item.nome}</div><div className="text-[11px] text-[#6E7091]">{item.responsavel?"Responsável definido":"Lista da casa"}</div></div><button onClick={onDelete} className="text-[11px] text-[#F0616D] font-semibold">Excluir</button></div>}

function Semana({atividades,membros,adiantamentos,onEdit,onAdvance}:{atividades:Activity[];membros:Profile[];adiantamentos:ActivityOccurrenceOverride[];onEdit:(a:Activity)=>void;onAdvance:(a:Activity,originalDay:number,targetDay:number)=>void}){
  const [dia,setDia]=useState(new Date().getDay());
  const [movendo,setMovendo]=useState<string|null>(null);
  const movedIn=adiantamentos.filter(o=>o.target_date===dataDia(dia)).map(o=>o.activity_id);
  const movedOut=adiantamentos.filter(o=>o.original_date===dataDia(dia)).map(o=>o.activity_id);
  const lista=atividades.filter(a=>a.ativo&&((vence(a,dia)&&!movedOut.includes(a.id))||movedIn.includes(a.id)));
  return <><div className="grid grid-cols-7 gap-1.5 mb-4">{DIAS.map((d,i)=><button key={d} onClick={()=>setDia(i)} className="rounded-xl py-2 bg-white shadow-sm" style={{border:dia===i?`2px solid ${ACCENT}`:"2px solid transparent"}}><div className="text-[9.5px] font-bold text-[#6E7091]">{d}</div></button>)}</div><div className="bg-white rounded-[20px] px-4 shadow-sm">{lista.length?lista.map(a=><div key={a.id} className="py-3 border-b border-[#E9E7F5] last:border-0 flex items-center gap-2"><div className="flex-1 min-w-0"><div className="text-[14px] font-semibold">{a.nome}</div><div className="text-[11px] text-[#6E7091]">{a.tipo==="flex"?"Flex · validação":"Tarefa"} · {membros.find(m=>m.id===a.responsavel)?.nome||"sem responsável"}{movedIn.includes(a.id)?" · adiantada para hoje":""}</div></div><button aria-label={`Editar ${a.nome}`} onClick={()=>onEdit(a)} className="w-9 h-9 rounded-full grid place-items-center text-[#6E7091] hover:bg-[#F3F2F8] active:scale-90 transition text-[18px]">✎</button>{a.recorrencia!=="diario"&&<button onClick={()=>setMovendo(movendo===a.id?null:a.id)} className="px-2.5 py-2 rounded-xl bg-[#F3F2F8] text-[10px] font-extrabold text-[#6E7091] active:scale-95">Adiantar</button>}{movendo===a.id&&<select autoFocus defaultValue={dia} onChange={e=>{onAdvance(a,dia,Number(e.target.value));setMovendo(null)}} className="absolute mt-20 right-5 z-20 rounded-xl border border-[#E9E7F5] bg-white px-2 py-2 text-[11px] shadow-lg">{DIAS.map((d,i)=><option key={d} value={i}>{d}</option>)}</select>}</div>):<Empty text="Nada nesse dia"/>}</div></>
}
function dataDia(d:number){const x=new Date();x.setHours(12,0,0,0);x.setDate(x.getDate()-x.getDay()+d);return x.toISOString().slice(0,10)}
function Overlay({children}:{children:React.ReactNode}){return <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] grid place-items-center p-4">{children}</div>}
function VoiceButton({onText}:{onText:(text:string)=>void}){const [ouvindo,setOuvindo]=useState(false);function start(){const W=window as unknown as {SpeechRecognition?:new()=>any;webkitSpeechRecognition?:new()=>any};const C=W.SpeechRecognition||W.webkitSpeechRecognition;if(!C){alert("Seu navegador não oferece ditado por voz.");return;}const r=new C();r.lang="pt-BR";r.interimResults=false;r.continuous=false;r.onstart=()=>setOuvindo(true);r.onend=()=>setOuvindo(false);r.onerror=()=>setOuvindo(false);r.onresult=(e:any)=>onText(e.results[0][0].transcript);r.start();}return <button type="button" aria-label="Ditar tarefa" onClick={start} className={`w-11 h-11 rounded-2xl grid place-items-center border ${ouvindo?"bg-[#FFF8E8] border-[#F0B429] text-[#B57900]":"bg-[#F7F6FC] border-[#E9E7F5] text-[#6E7091]"} active:scale-95 transition`}><span className="text-[19px]">🎙️</span></button>}

function EditarAtividade({atividade,membros,onClose,onSaved}:{atividade:Activity;membros:Profile[];onClose:()=>void;onSaved:()=>void}){
  const [nome,setNome]=useState(atividade.nome);const [resp,setResp]=useState(atividade.responsavel||membros[0]?.id||"");const [tipo,setTipo]=useState<ActivityType>(atividade.tipo);const [cond,setCond]=useState(atividade.condicao||"");const [rec,setRec]=useState<Recorrencia>(atividade.recorrencia);const [dias,setDias]=useState<number[]>(atividade.dias_semana||[]);const [busy,setBusy]=useState(false);const supabase=createClient();
  function toggleDia(d:number){setDias(p=>p.includes(d)?p.filter(x=>x!==d):[...p,d].sort((a,b)=>a-b));}
  async function save(){if(!nome.trim()||!resp)return;if(rec!=="diario"&&!dias.length){alert("Escolha pelo menos um dia da semana.");return;}if(tipo==="flex"&&!cond.trim()){alert("Informe a condição da tarefa Flex.");return;}setBusy(true);const {error}=await supabase.from("activities").update({nome:nome.trim(),responsavel:resp,tipo,condicao:tipo==="flex"?cond.trim():null,recorrencia:rec,dias_semana:rec==="diario"?null:dias}).eq("id",atividade.id);setBusy(false);if(error){alert(`Não foi possível salvar a tarefa: ${error.message}`);return;}onSaved();}
  return <Overlay><div className="bg-white rounded-[26px] w-[min(94vw,500px)] max-h-[90vh] overflow-y-auto p-5 shadow-2xl"><div className="flex items-center justify-between"><div><div className="text-[19px] font-extrabold">Editar tarefa</div><div className="text-[12px] text-[#6E7091] mt-1">Altere a programação sem criar outra tarefa.</div></div><button onClick={onClose} className="w-9 h-9 rounded-full bg-[#F3F2F8] text-[#6E7091]">×</button></div>
    <label className="block text-[12px] font-bold text-[#6E7091] mt-5">Tarefa</label><div className="flex gap-2 mt-2"><input autoFocus value={nome} onChange={e=>setNome(e.target.value)} className="flex-1 rounded-2xl border border-[#E9E7F5] px-4 py-3 outline-none focus:ring-2 focus:ring-[#12A87A]"/><VoiceButton onText={t=>setNome(p=>p?`${p} ${t}`:t)}/></div>
    <label className="block text-[12px] font-bold text-[#6E7091] mt-4">Responsável</label><select value={resp} onChange={e=>setResp(e.target.value)} className="w-full mt-2 rounded-2xl border border-[#E9E7F5] px-4 py-3 bg-white">{membros.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}</select>
    <label className="block text-[12px] font-bold text-[#6E7091] mt-4">Tipo</label><div className="grid grid-cols-2 gap-2 mt-2"><button type="button" onClick={()=>setTipo("normal")} className={`rounded-2xl py-3 text-[12px] font-extrabold ${tipo==="normal"?"bg-[#E8FAF4] text-[#087A58]":"bg-[#F3F2F8] text-[#6E7091]"}`}>Tarefa normal</button><button type="button" onClick={()=>setTipo("flex")} className={`rounded-2xl py-3 text-[12px] font-extrabold ${tipo==="flex"?"bg-[#FFF8E8] text-[#B57900]":"bg-[#F3F2F8] text-[#6E7091]"}`}>Flex · validação</button></div>
    {tipo==="flex"&&<><label className="block text-[12px] font-bold text-[#6E7091] mt-4">Condição da validação</label><textarea value={cond} onChange={e=>setCond(e.target.value)} className="w-full mt-2 min-h-[88px] rounded-2xl border border-[#E9E7F5] px-4 py-3 outline-none focus:ring-2 focus:ring-[#F0B429]" placeholder="Ex.: Há roupa na máquina?"/></>}
    <label className="block text-[12px] font-bold text-[#6E7091] mt-4">Quando acontece</label><select value={rec} onChange={e=>setRec(e.target.value as Recorrencia)} className="w-full mt-2 rounded-2xl border border-[#E9E7F5] px-4 py-3 bg-white"><option value="diario">Todos os dias</option><option value="semanal">Dias selecionados</option><option value="personalizado">Programação personalizada</option></select>
    {rec!=="diario"&&<div className="grid grid-cols-7 gap-1.5 mt-3">{DIAS.map((d,i)=><button type="button" key={d} onClick={()=>toggleDia(i)} className={`rounded-xl py-2 text-[10px] font-bold border ${dias.includes(i)?"bg-[#E8FAF4] border-[#12A87A] text-[#087A58]":"bg-white border-[#E9E7F5] text-[#6E7091]"}`}>{d}</button>)}</div>}
    <div className="flex gap-2 mt-6"><button onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold bg-[#F3F2F8]">Cancelar</button><button disabled={busy||!nome.trim()||!resp} onClick={save} className="flex-1 py-3 rounded-2xl font-bold text-white bg-[#12A87A] disabled:opacity-50">{busy?"Salvando…":"Salvar alterações"}</button></div>
  </div></Overlay>;
}

function NovaAtividade({membros,onClose,onSaved}:{membros:Profile[];onClose:()=>void;onSaved:()=>void}){const [nome,setNome]=useState("");const [resp,setResp]=useState(membros[0]?.id||"");const [tipo,setTipo]=useState<ActivityType>("normal");const [cond,setCond]=useState("");const [busy,setBusy]=useState(false);const supabase=createClient();async function save(){if(!nome.trim()||!resp)return;setBusy(true);const {error}=await supabase.from("activities").insert({nome:nome.trim(),responsavel:resp,tipo,condicao:tipo==="flex"?(cond.trim()||null):null,recorrencia:"diario",dias_semana:null,ativo:true});setBusy(false);if(error){alert("Não foi possível criar a tarefa. Verifique as permissões do usuário.");return;}onClose();onSaved();}return <Overlay><div className="bg-white rounded-[24px] p-5 w-[min(92vw,440px)]"><div className="text-[18px] font-extrabold">Nova tarefa</div><div className="flex gap-2 mt-4"><input autoFocus value={nome} onChange={e=>setNome(e.target.value)} placeholder="O que precisa ser feito?" className="flex-1 rounded-2xl border border-[#E9E7F5] px-4 py-3 outline-none focus:ring-2 focus:ring-[#12A87A]"/><VoiceButton onText={t=>setNome(p=>p?`${p} ${t}`:t)}/></div><select value={resp} onChange={e=>setResp(e.target.value)} className="w-full mt-3 rounded-2xl border border-[#E9E7F5] px-4 py-3 bg-white">{membros.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}</select><div className="grid grid-cols-2 gap-2 mt-3"><button onClick={()=>setTipo("normal")} className={`rounded-2xl py-3 text-[12px] font-extrabold ${tipo==="normal"?"bg-[#E8FAF4] text-[#087A58]":"bg-[#F3F2F8] text-[#6E7091]"}`}>Tarefa normal</button><button onClick={()=>setTipo("flex")} className={`rounded-2xl py-3 text-[12px] font-extrabold ${tipo==="flex"?"bg-[#FFF8E8] text-[#B57900]":"bg-[#F3F2F8] text-[#6E7091]"}`}>Flex · validação</button></div>{tipo==="flex"&&<textarea value={cond} onChange={e=>setCond(e.target.value)} placeholder="Qual condição deve ser verificada?" className="w-full mt-3 min-h-[90px] rounded-2xl border border-[#E9E7F5] px-4 py-3"/>}<div className="flex gap-2 mt-4"><button onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold bg-[#F3F2F8]">Cancelar</button><button disabled={busy||!nome.trim()||!resp||(tipo==="flex"&&!cond.trim())} onClick={save} className="flex-1 py-3 rounded-2xl font-bold text-white bg-[#12A87A] disabled:opacity-50">{busy?"Criando…":"Criar tarefa"}</button></div></div></Overlay>}

function NovaCompra({membros,meuId,onClose,onSaved}:{membros:Profile[];meuId:string;onClose:()=>void;onSaved:()=>void}){const [nome,setNome]=useState("");const [resp,setResp]=useState(meuId);const [busy,setBusy]=useState(false);const supabase=createClient();async function save(){if(!nome.trim())return;setBusy(true);const {error}=await supabase.from("shopping_items").insert({nome:nome.trim(),responsavel:resp||null,comprado:false});setBusy(false);if(error){alert("Não foi possível adicionar o item.");return;}onClose();onSaved();}return <Overlay><div className="bg-white rounded-[24px] p-5 w-[min(92vw,420px)]"><div className="text-[18px] font-extrabold">Novo item de compra</div><input autoFocus value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex.: arroz, fralda, detergente" className="w-full mt-4 rounded-2xl border border-[#E9E7F5] px-4 py-3 outline-none focus:ring-2 focus:ring-[#12A87A]"/><select value={resp} onChange={e=>setResp(e.target.value)} className="w-full mt-3 rounded-2xl border border-[#E9E7F5] px-4 py-3 bg-white">{membros.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}</select><div className="flex gap-2 mt-4"><button onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold bg-[#F3F2F8]">Cancelar</button><button disabled={busy||!nome.trim()} onClick={save} className="flex-1 py-3 rounded-2xl font-bold text-white bg-[#12A87A] disabled:opacity-50">Adicionar</button></div></div></Overlay>}

function FlexModal({activity,completion,busy,onClose,onResult}:{activity:Activity;completion:ActivityCompletion|undefined;busy:boolean;onClose:()=>void;onResult:(v:boolean)=>void}){return <Overlay><div className="bg-white rounded-[24px] p-5 w-[min(92vw,420px)] shadow-2xl"><div className="text-[18px] font-extrabold">Verificação Flex</div><div className="text-[14px] font-semibold mt-4">{activity.nome}</div>{activity.condicao&&<div className="mt-2 p-3 rounded-2xl bg-[#F7F6FC] text-[13px] text-[#6E7091]">Condição: {activity.condicao}</div>}<div className="text-[12px] text-[#6E7091] mt-4">A verificação sempre fica registrada. Só conta como atividade realizada quando a condição for verdadeira.</div>{completion&&<div className={`mt-3 text-[12px] font-bold ${completion.validacao_resultado?"text-[#12A87A]":"text-[#B57900]"}`}>Último resultado: {completion.validacao_resultado?"VERDADEIRA — contabilizada":"FALSA — não contabilizada"}</div>}<div className="grid grid-cols-2 gap-3 mt-5"><button disabled={busy} onClick={()=>onResult(false)} className="rounded-2xl py-3 font-extrabold bg-[#FFF8E8] text-[#B57900] active:scale-95 transition">Não</button><button disabled={busy} onClick={()=>onResult(true)} className="rounded-2xl py-3 font-extrabold bg-[#E8FAF4] text-[#087A58] active:scale-95 transition">Sim, condição verdadeira</button></div><button onClick={onClose} className="w-full mt-3 py-2 text-[12px] font-bold text-[#6E7091]">Cancelar</button></div></Overlay>}
