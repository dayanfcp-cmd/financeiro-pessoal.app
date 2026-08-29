"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { editarPerfil } from "@/lib/data/actions";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

const MODULOS_DISPONIVEIS = [
  { id: "financeiro", label: "Financeiro" },
  { id: "atividades", label: "Atividades" },
  { id: "usuarios", label: "Usuários" },
];

const MOD_STYLE: Record<string, string> = {
  financeiro: "bg-[#ECE8FF] text-[#4E31C9]",
  atividades: "bg-[#DFF5EC] text-[#0B7A57]",
  usuarios: "bg-[#FBF1DD] text-[#8a5c10]",
};

export function UsuariosClient({ meuId, souDono, membrosIniciais }: { meuId: string; souDono: boolean; membrosIniciais: Profile[]; }) {
  const router = useRouter();
  const [membros] = useState(membrosIniciais);
  const [sheet, setSheet] = useState<"nenhum" | "novo" | { editando: Profile }>("nenhum");
  function recarregar() { router.refresh(); }

  return <div className="min-h-screen bg-[var(--bg,#F5F4FB)] px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-16 md:max-w-[640px] md:mx-auto">
    <div className="flex items-center gap-3 mb-6"><button onClick={() => router.push("/")} className="w-9 h-9 rounded-full bg-white border border-[#E9E7F5] grid place-items-center"><Icon name="chev" className="w-4 h-4 rotate-180 text-[#6E7091]" /></button><h1 className="text-[19px] font-extrabold tracking-tight">Usuários</h1></div>
    <div className="text-[13px] font-bold text-[#6E7091] mb-2 px-1">Quem tem acesso</div>
    <div className="bg-white rounded-[20px] shadow-[0_2px_4px_rgba(76,60,150,.05),0_14px_34px_rgba(76,60,150,.09)] px-3">
      {membros.map((m) => <div key={m.id} className="flex items-center gap-3 py-3.5 border-b border-[#E9E7F5] last:border-0">
        {m.avatar_url ? <img src={m.avatar_url} alt={m.nome} className="w-10 h-10 rounded-full object-cover flex-none border border-white shadow-sm" /> : <span className="w-10 h-10 rounded-full grid place-items-center text-white font-extrabold text-[14px] flex-none" style={{ background: m.cor || "#6C4BF4" }}>{m.nome.charAt(0).toUpperCase()}</span>}
        <div className="flex-1 min-w-0"><div className="text-[14.5px] font-bold">{m.nome} {m.papel === "dono" && <span className="text-[11px] font-semibold text-[#6E7091]">(dono)</span>}</div><div className="flex gap-1.5 flex-wrap mt-1.5">{m.modulos.map((mod) => <span key={mod} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${MOD_STYLE[mod] || "bg-gray-100 text-gray-600"}`}>{MODULOS_DISPONIVEIS.find((d) => d.id === mod)?.label || mod}</span>)}</div></div>
        {souDono && <button aria-label={`Editar ${m.nome}`} onClick={() => setSheet({ editando: m })} className="text-[#6E7091] p-2 text-[18px]">✎</button>}
      </div>)}
    </div>
    {souDono && <button onClick={() => setSheet("novo")} className="w-full mt-4 py-3.5 rounded-2xl border-2 border-dashed border-[#E9E7F5] text-[#CF8A1C] font-extrabold text-[14px]">+ Novo usuário</button>}
    {sheet !== "nenhum" && <SheetUsuario alvo={typeof sheet === "object" ? sheet.editando : null} souEuMesmo={typeof sheet === "object" && sheet.editando.id === meuId} onFechar={() => setSheet("nenhum")} onSalvo={() => { setSheet("nenhum"); recarregar(); }} />}
  </div>;
}

function SheetUsuario({ alvo, souEuMesmo, onFechar, onSalvo }: { alvo: Profile | null; souEuMesmo: boolean; onFechar: () => void; onSalvo: () => void; }) {
  const editando = !!alvo;
  const supabase = createClient();
  const [nome, setNome] = useState(alvo?.nome ?? "");
  const [username, setUsername] = useState(alvo?.username ?? "");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modulos, setModulos] = useState<string[]>(alvo?.modulos ?? ["atividades"]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(alvo?.avatar_url ?? null);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function toggleModulo(id: string) { setModulos((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id])); }
  function selecionarAvatar(file: File | undefined) { if (!file) return; if (!file.type.startsWith("image/")) { setErro("Escolha uma imagem."); return; } if (file.size > 5 * 1024 * 1024) { setErro("A foto deve ter no máximo 5 MB."); return; } setErro(null); setAvatarFile(file); setPreview(URL.createObjectURL(file)); }

  async function uploadAvatar(profileId: string, householdId: string) {
    if (!avatarFile) return null;
    const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${householdId}/${profileId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatarFile, { contentType: avatarFile.type, upsert: false });
    if (uploadError) throw new Error(`Não foi possível enviar a foto: ${uploadError.message}`);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", profileId);
    if (updateError) throw new Error(`Foto enviada, mas não foi possível salvar o perfil: ${updateError.message}`);
    return data.publicUrl;
  }

  async function salvar() {
    if (!nome.trim()) { setErro("Informe o nome."); return; }
    setSalvando(true); setErro(null);
    try {
      if (editando && alvo) {
        await editarPerfil({ id: alvo.id, nome: nome.trim(), modulos });
        if (avatarFile) await uploadAvatar(alvo.id, alvo.household_id);
      } else {
        if (!email.trim() || !senha.trim()) { setErro("Preencha e-mail e senha."); setSalvando(false); return; }
        const res = await fetch("/api/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), senha, nome: nome.trim(), username: username.trim(), modulos }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Não foi possível criar o usuário.");
        if (avatarFile && (data.profile?.id || data.id || data.userId)) await uploadAvatar(data.profile?.id || data.id || data.userId, data.profile?.household_id || alvo?.household_id || "pending");
      }
      onSalvo();
    } catch (e) { setErro(e instanceof Error ? e.message : "Erro ao salvar."); }
    finally { setSalvando(false); }
  }

  async function remover() {
    if (!alvo) return; setRemovendo(true); setErro(null);
    try { const res = await fetch("/api/usuarios", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: alvo.id }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "Não foi possível remover."); onSalvo(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Erro ao remover."); } finally { setRemovendo(false); }
  }

  return <div className="fixed inset-0 z-40 flex items-end justify-center"><div className="absolute inset-0 bg-black/40" onClick={onFechar} /><div className="relative bg-white w-full max-w-[460px] rounded-t-[24px] p-5 pb-[calc(24px+env(safe-area-inset-bottom))] max-h-[88vh] overflow-y-auto">
    <div className="w-10 h-1.5 rounded-full bg-[#E9E7F5] mx-auto mb-4" /><h3 className="text-[18px] font-extrabold mb-4">{editando ? "Editar usuário" : "Novo usuário"}</h3>
    <div className="flex flex-col items-center mb-5"><label className="relative cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={(e) => selecionarAvatar(e.target.files?.[0])}/>{preview ? <img src={preview} alt="Foto de perfil" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"/> : <div className="w-24 h-24 rounded-full bg-[#ECE8FF] text-[#6C4BF4] grid place-items-center text-3xl font-black shadow-sm">{nome.charAt(0).toUpperCase() || "?"}</div>}<span className="absolute right-0 bottom-0 w-9 h-9 rounded-full bg-[#CF8A1C] text-white grid place-items-center border-4 border-white text-sm">📷</span></label><span className="text-[11px] text-[#6E7091] mt-2">Toque para alterar a foto</span></div>
    <label className="block mb-3.5"><span className="block text-[12px] font-bold text-[#6E7091] mb-1.5">Nome</span><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da pessoa" className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-2.5 text-[14.5px] outline-none" /></label>
    {!editando && <><label className="block mb-3.5"><span className="block text-[12px] font-bold text-[#6E7091] mb-1.5">Nome de usuário</span><input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))} autoCapitalize="none" autoCorrect="off" placeholder="ex.: anna" className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-2.5 text-[14.5px] outline-none"/><span className="block text-[11px] text-[#6E7091] mt-1.5">Será usado para entrar no app.</span></label><label className="block mb-3.5"><span className="block text-[12px] font-bold text-[#6E7091] mb-1.5">E-mail</span><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@exemplo.com" className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-2.5 text-[14.5px] outline-none" /></label><label className="block mb-3.5"><span className="block text-[12px] font-bold text-[#6E7091] mb-1.5">Senha inicial</span><input value={senha} onChange={(e) => setSenha(e.target.value)} type="text" placeholder="mínimo 6 caracteres" className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-2.5 text-[14.5px] outline-none" /></label></>}
    <div className="mb-2"><span className="block text-[12px] font-bold text-[#6E7091] mb-2">Módulos que essa pessoa acessa</span>{MODULOS_DISPONIVEIS.map((m) => <div key={m.id} className="flex items-center justify-between py-2.5 border-b border-[#E9E7F5] last:border-0"><span className="text-[14px] font-semibold">{m.label}</span><button onClick={() => toggleModulo(m.id)} disabled={souEuMesmo && m.id === "usuarios"} className={`w-[42px] h-[25px] rounded-full relative transition disabled:opacity-40 ${modulos.includes(m.id) ? "bg-[#CF8A1C]" : "bg-[#E9E7F5]"}`}><span className={`absolute top-[2.5px] w-5 h-5 rounded-full bg-white shadow transition-all ${modulos.includes(m.id) ? "left-[19px]" : "left-[3px]"}`} /></button></div>)}</div>
    {erro && <div className="text-[#B23B36] text-[13px] mt-3">{erro}</div>}
    <button onClick={salvar} disabled={salvando} className="w-full mt-5 py-3.5 rounded-2xl font-extrabold text-[15px] bg-[#CF8A1C] text-white disabled:opacity-60">{salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar usuário"}</button>
    {editando && !souEuMesmo && <button onClick={remover} disabled={removendo} className="w-full mt-2.5 py-3 rounded-2xl font-bold text-[13.5px] border border-[#F0616D] text-[#F0616D] disabled:opacity-60">{removendo ? "Removendo..." : "Remover usuário"}</button>}
  </div></div>;
}
