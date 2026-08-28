import { redirect } from "next/navigation";
import { getUser } from "@/lib/data/queries";
import { getMeuPerfil } from "@/lib/data/household-queries";
import { Launcher } from "@/components/app/Launcher";

export default async function LauncherPage() {
  const user = await getUser();
  if (!user) redirect("/entrar");

  const perfil = await getMeuPerfil();
  if (!perfil) {
    // Login válido mas sem perfil vinculado a uma casa. Manda pra /entrar com
    // um sinalizador — a tela de entrar (client-side) é quem consegue encerrar
    // a sessão de verdade (Server Component não grava cookie no navegador),
    // evitando o loop de ficar indo e voltando entre "/" e "/entrar".
    redirect("/entrar?semperfil=1");
  }

  return <Launcher nome={perfil.nome} modulos={perfil.modulos} />;
}
