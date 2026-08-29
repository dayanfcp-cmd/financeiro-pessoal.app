import { redirect } from "next/navigation";
import { getAtividades, getConclusoesDoDia, getListaCompras } from "@/lib/data/queries";
import { getMeuPerfil, getMembrosDaCasa } from "@/lib/data/household-queries";
import { AtividadesV2Client } from "@/components/app/AtividadesV2Client";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AtividadesPage() {
  // getMeuPerfil já valida a sessão via Supabase Auth. Não fazemos um segundo
  // getUser() antes dele: isso economiza uma ida ao Auth justamente no clique
  // da Anna no primeiro carregamento da tela.
  const perfil = await getMeuPerfil();
  if (!perfil) redirect("/entrar");
  if (!perfil.modulos.includes("atividades")) redirect("/");

  const [membros, atividades, conclusoesHoje, compras] = await Promise.all([
    getMembrosDaCasa(perfil.household_id),
    getAtividades(),
    getConclusoesDoDia(hojeISO()),
    getListaCompras(),
  ]);

  return (
    <AtividadesV2Client
      meuId={perfil.id}
      membros={membros}
      atividadesIniciais={atividades}
      conclusoesHojeIniciais={conclusoesHoje}
      comprasIniciais={compras}
    />
  );
}
