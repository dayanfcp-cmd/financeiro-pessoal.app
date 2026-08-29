"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/icons";

function EntrarPageConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [identifier, setIdentifier] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let resolvido = false;
    const marcarResolvido = () => { if (!resolvido) { resolvido = true; setVerificandoSessao(false); } };
    if (searchParams.get("semperfil") === "1") {
      supabase.auth.signOut().finally(() => {
        setAviso("Sua sessão foi encerrada porque essa conta não está vinculada a nenhuma casa. Fale com o dono da casa para ser adicionado.");
        marcarResolvido();
      });
      return;
    }
    const timeoutId = setTimeout(marcarResolvido, 4000);
    supabase.auth.getUser().then(({ data }) => {
      clearTimeout(timeoutId);
      if (data.user) router.replace("/"); else marcarResolvido();
    }).catch(() => { clearTimeout(timeoutId); marcarResolvido(); });
    return () => clearTimeout(timeoutId);
  }, [router, supabase, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null); setAviso(null); setCarregando(true);
    const res = await fetch("/api/auth/resolve-login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const data = await res.json();
    if (!res.ok) { setCarregando(false); setErro(data.error || "Usuário ou e-mail não encontrado."); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: senha });
    setCarregando(false);
    if (error) { setErro(traduzErro(error.message)); return; }
    router.replace("/"); router.refresh();
  }

  if (verificandoSessao) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#8A6BFF] via-[#6C4BF4] to-[#4E31C9]" />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gradient-to-br from-[#8A6BFF] via-[#6C4BF4] to-[#4E31C9]">
      <div className="w-full max-w-sm text-center text-white mb-8">
        <div className="w-16 h-16 mx-auto mb-5 opacity-95"><PersonArt /></div>
        <h1 className="text-2xl font-extrabold tracking-tight leading-tight">Home Care<br />num lugar só</h1>
        <p className="text-sm text-violet-100/80 mt-2">Entre com seu usuário ou e-mail.</p>
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-4">
        <label className="text-left">
          <span className="block text-xs font-bold text-[#6E7091] mb-1.5">Usuário ou e-mail</span>
          <input required value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoCapitalize="none" autoCorrect="off" className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-3 text-[15px] outline-none focus:border-[#6C4BF4] focus:ring-2 focus:ring-[#6C4BF4]/20" placeholder="dayan ou voce@email.com" />
        </label>
        <label className="text-left">
          <span className="block text-xs font-bold text-[#6E7091] mb-1.5">Senha</span>
          <input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-3 text-[15px] outline-none focus:border-[#6C4BF4] focus:ring-2 focus:ring-[#6C4BF4]/20" placeholder="mínimo 6 caracteres" />
        </label>
        {erro && <div className="flex items-start gap-2 text-[#B23B36] text-sm bg-[#FBEAEA] rounded-xl px-3 py-2.5"><Icon name="alerta" className="w-4 h-4 mt-0.5 shrink-0" /><span>{erro}</span></div>}
        {aviso && <div className="text-[#4E31C9] text-sm bg-[#ECE8FF] rounded-xl px-3 py-2.5">{aviso}</div>}
        <button type="submit" disabled={carregando} className="w-full bg-[#6C4BF4] text-white font-extrabold rounded-2xl py-3.5 text-[15px] shadow-lg shadow-[#6C4BF4]/30 disabled:opacity-60">{carregando ? "Só um instante…" : "Entrar"}</button>
      </form>
    </div>
  );
}

function traduzErro(msg: string) {
  if (msg.includes("Invalid login credentials")) return "Usuário/e-mail ou senha incorretos.";
  if (msg.includes("Password should be")) return "A senha precisa ter pelo menos 6 caracteres.";
  return msg;
}

function PersonArt() {
  return <svg viewBox="0 0 240 214" fill="none" className="w-full h-full text-white"><ellipse cx="120" cy="128" rx="90" ry="70" fill="currentColor" opacity=".14" /><g stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none"><path d="M101 60c0-16 38-16 38 0" /><circle cx="120" cy="66" r="18" /><circle cx="114" cy="66" r="2.4" fill="currentColor" /><circle cx="126" cy="66" r="2.4" fill="currentColor" /><path d="M116 74c3 3 5 3 8 0" /><path d="M120 84c-16 2-25 12-27 30" /><path d="M120 84c16 2 25 12 27 30" /><path d="M100 100c-10 6-14 16-12 26" /><path d="M140 100c10 6 14 16 12 26" /><path d="M96 132h48l7 26h-62z" fillOpacity=".18" fill="currentColor" /><path d="M86 162h68" /><path d="M96 172c6 12 42 12 48 0" /></g></svg>;
}

export default function EntrarPage() {
  return <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-[#8A6BFF] via-[#6C4BF4] to-[#4E31C9]" />}><EntrarPageConteudo /></Suspense>;
}
