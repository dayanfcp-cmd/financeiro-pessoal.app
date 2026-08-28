import { redirect } from "next/navigation";
import { getUser, getAtividades, getConclusoesDoDia, getListaCompras } from "@/lib/data/queries";
import { getMeuPerfil, getMembrosDaCasa } from "@/lib/data/household-queries";
import { AtividadesClient } from "@/components/app/AtividadesClient";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AtividadesPage() {
  const user = await getUser();
  if (!user) redirect("/entrar");

  const perfil = await getMeuPerfil();
  if (!perfil || !perfil.modulos.includes("atividades")) redirect("/");

  const [membros, atividades, conclusoesHoje, compras] = await Promise.all([
    getMembrosDaCasa(perfil.household_id),
    getAtividades(),
    getConclusoesDoDia(hojeISO()),
    getListaCompras(),
  ]);

  return (
    <AtividadesClient
      meuId={perfil.id}
      membros={membros}
      atividadesIniciais={atividades}
      conclusoesHojeIniciais={conclusoesHoje}
      comprasIniciais={compras}
    />
  );
}
