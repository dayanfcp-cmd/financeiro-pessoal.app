import { redirect } from "next/navigation";
import { getUser } from "@/lib/data/queries";
import { getMeuPerfil, getMembrosDaCasa } from "@/lib/data/household-queries";
import { UsuariosClient } from "@/components/app/UsuariosClient";

export default async function UsuariosPage() {
  const user = await getUser();
  if (!user) redirect("/entrar");

  const perfil = await getMeuPerfil();
  if (!perfil || !perfil.modulos.includes("usuarios")) redirect("/");

  const membros = await getMembrosDaCasa(perfil.household_id);

  return <UsuariosClient meuId={perfil.id} souDono={perfil.papel === "dono"} membrosIniciais={membros} />;
}
