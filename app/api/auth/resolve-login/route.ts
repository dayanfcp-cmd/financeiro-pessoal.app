import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizar(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "");
}

export async function POST(req: NextRequest) {
  const { identifier } = await req.json() as { identifier?: string };
  const value = normalizar(identifier || "");
  if (!value) return NextResponse.json({ error: "Informe usuário ou e-mail." }, { status: 400 });

  // E-mail continua sendo aceito diretamente pelo Supabase Auth.
  if (value.includes("@")) return NextResponse.json({ email: value });

  const admin = createAdminClient();
  const { data: profile, error } = await admin.from("profiles").select("id").ilike("username", value).maybeSingle();
  if (error || !profile) return NextResponse.json({ error: "Usuário ou e-mail não encontrado." }, { status: 404 });

  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(profile.id);
  if (authError || !authUser.user?.email) return NextResponse.json({ error: "Usuário ou e-mail não encontrado." }, { status: 404 });

  return NextResponse.json({ email: authUser.user.email });
}
