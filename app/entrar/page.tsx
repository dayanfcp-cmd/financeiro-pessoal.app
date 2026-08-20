"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/icons";

export default function EntrarPage() {
  const router = useRouter();
  const supabase = createClient();

  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      setCarregando(false);
      if (error) {
        setErro(traduzErro(error.message));
        return;
      }
      router.replace("/");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password: senha });
      setCarregando(false);
      if (error) {
        setErro(traduzErro(error.message));
        return;
      }
      setAviso("Conta criada. Verifique seu e-mail para confirmar o acesso, depois entre normalmente.");
      setModo("entrar");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gradient-to-br from-[#8A6BFF] via-[#6C4BF4] to-[#4E31C9]">
      <div className="w-full max-w-sm text-center text-white mb-8">
        <div className="w-16 h-16 mx-auto mb-5 opacity-95">
          <PersonArt />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight leading-tight">
          Sua vida financeira,
          <br />
          num lugar só
        </h1>
        <p className="text-sm text-violet-100/80 mt-2">
          Controle o que entra, o que sai e o que vem pela frente.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-4"
      >
        <div className="flex bg-[#F1EFFA] rounded-2xl p-1 mb-1">
          <button
            type="button"
            onClick={() => setModo("entrar")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
              modo === "entrar" ? "bg-white shadow text-[#20233D]" : "text-[#6E7091]"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setModo("criar")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
              modo === "criar" ? "bg-white shadow text-[#20233D]" : "text-[#6E7091]"
            }`}
          >
            Criar conta
          </button>
        </div>

        <label className="text-left">
          <span className="block text-xs font-bold text-[#6E7091] mb-1.5">E-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-3 text-[15px] outline-none focus:border-[#6C4BF4] focus:ring-2 focus:ring-[#6C4BF4]/20"
            placeholder="voce@email.com"
          />
        </label>

        <label className="text-left">
          <span className="block text-xs font-bold text-[#6E7091] mb-1.5">Senha</span>
          <input
            type="password"
            required
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full border border-[#E9E7F5] rounded-xl px-3.5 py-3 text-[15px] outline-none focus:border-[#6C4BF4] focus:ring-2 focus:ring-[#6C4BF4]/20"
            placeholder="mínimo 6 caracteres"
          />
        </label>

        {erro && (
          <div className="flex items-start gap-2 text-[#B23B36] text-sm bg-[#FBEAEA] rounded-xl px-3 py-2.5">
            <Icon name="alerta" className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}
        {aviso && (
          <div className="text-[#4E31C9] text-sm bg-[#ECE8FF] rounded-xl px-3 py-2.5">
            {aviso}
          </div>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-[#6C4BF4] text-white font-extrabold rounded-2xl py-3.5 text-[15px] shadow-lg shadow-[#6C4BF4]/30 disabled:opacity-60"
        >
          {carregando ? "Só um instante…" : modo === "entrar" ? "Entrar" : "Criar minha conta"}
        </button>
      </form>
    </div>
  );
}

function traduzErro(msg: string) {
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("User already registered")) return "Já existe uma conta com esse e-mail.";
  if (msg.includes("Password should be")) return "A senha precisa ter pelo menos 6 caracteres.";
  return msg;
}

function PersonArt() {
  return (
    <svg viewBox="0 0 240 214" fill="none" className="w-full h-full text-white">
      <ellipse cx="120" cy="128" rx="90" ry="70" fill="currentColor" opacity=".14" />
      <g stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M101 60c0-16 38-16 38 0" />
        <circle cx="120" cy="66" r="18" />
        <circle cx="114" cy="66" r="2.4" fill="currentColor" />
        <circle cx="126" cy="66" r="2.4" fill="currentColor" />
        <path d="M116 74c3 3 5 3 8 0" />
        <path d="M120 84c-16 2-25 12-27 30" />
        <path d="M120 84c16 2 25 12 27 30" />
        <path d="M100 100c-10 6-14 16-12 26" />
        <path d="M140 100c10 6 14 16 12 26" />
        <path d="M96 132h48l7 26h-62z" fillOpacity=".18" fill="currentColor" />
        <path d="M86 162h68" />
        <path d="M96 172c6 12 42 12 48 0" />
      </g>
    </svg>
  );
}
