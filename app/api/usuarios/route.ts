import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Confere que quem está chamando é o dono da casa. Retorna o household_id ou null. */
async function exigirDono() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("household_id, papel")
    .eq("id", user.id)
    .single();

  if (!perfil || perfil.papel !== "dono") return null;
  return perfil.household_id as string;
}

export async function POST(req: NextRequest) {
  const householdId = await exigirDono();
  if (!householdId) {
    return NextResponse.json({ error: "Apenas o dono da casa pode criar usuários." }, { status: 403 });
  }

  const body = await req.json();
  const { email, senha, nome, modulos } = body as {
    email: string;
    senha: string;
    nome: string;
    modulos: string[];
  };

  if (!email || !senha || !nome) {
    return NextResponse.json({ error: "Preencha nome, e-mail e senha." }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: novoUsuario, error: erroCriacao } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (erroCriacao || !novoUsuario.user) {
    const msg = erroCriacao?.message?.includes("already been registered")
      ? "Já existe uma conta com esse e-mail."
      : erroCriacao?.message || "Não foi possível criar o usuário.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: erroPerfil } = await admin.from("profiles").insert({
    id: novoUsuario.user.id,
    household_id: householdId,
    nome,
    papel: "membro",
    modulos: modulos && modulos.length ? modulos : ["atividades"],
  });

  if (erroPerfil) {
    // reverte a criação do login se não conseguimos criar o perfil
    await admin.auth.admin.deleteUser(novoUsuario.user.id);
    return NextResponse.json({ error: "Não foi possível vincular o usuário à casa." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: novoUsuario.user.id });
}

export async function DELETE(req: NextRequest) {
  const householdId = await exigirDono();
  if (!householdId) {
    return NextResponse.json({ error: "Apenas o dono da casa pode remover usuários." }, { status: 403 });
  }

  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: "Usuário não informado." }, { status: 400 });

  const admin = createAdminClient();

  // confere que o usuário a remover é da mesma casa antes de apagar
  const { data: alvo } = await admin.from("profiles").select("household_id, papel").eq("id", id).single();
  if (!alvo || alvo.household_id !== householdId) {
    return NextResponse.json({ error: "Usuário não encontrado nesta casa." }, { status: 404 });
  }
  if (alvo.papel === "dono") {
    return NextResponse.json({ error: "O dono da casa não pode ser removido." }, { status: 400 });
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: "Não foi possível remover o usuário." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
