import { redirect } from "next/navigation";
import { getAtividades, getConclusoesDoDia, getListaCompras } from "@/lib/data/queries";
import { getMeuPerfil, getMembrosDaCasa } from "@/lib/data/household-queries";
import { AtividadesV2Client } from "@/components/app/AtividadesV2Client";
import { LogoutButton } from "@/components/app/LogoutButton";

function hojeISO() {
  const agora = new Date();
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export default async function AtividadesPage() {
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
    <>
      <LogoutButton />
      <AtividadesV2Client
        meuId={perfil.id}
        householdId={perfil.household_id}
        membros={membros}
        atividadesIniciais={atividades}
        conclusoesHojeIniciais={conclusoesHoje}
        comprasIniciais={compras}
      />
    </>
  );
}
