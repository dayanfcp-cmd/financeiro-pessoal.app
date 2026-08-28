import { redirect } from "next/navigation";
import { getUser } from "@/lib/data/queries";
import { getMeuPerfil } from "@/lib/data/household-queries";
import { Launcher } from "@/components/app/Launcher";

export default async function LauncherPage() {
  const user = await getUser();
  if (!user) redirect("/entrar");

  const perfil = await getMeuPerfil();
  if (!perfil) {
    // login existe mas ainda não tem perfil vinculado a uma casa
    redirect("/entrar");
  }

  return <Launcher nome={perfil.nome} modulos={perfil.modulos} />;
}
