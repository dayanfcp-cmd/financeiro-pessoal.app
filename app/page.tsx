import { redirect } from "next/navigation";
import { getUser, getAccounts, getCards, getCategories, buildCategoryTree, getTransactions } from "@/lib/data/queries";
import { AppClient } from "@/components/app/AppClient";

export default async function Home() {
  const user = await getUser();
  if (!user) {
    redirect("/entrar");
  }

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const [accounts, cards, categories, transactions] = await Promise.all([
    getAccounts(),
    getCards(),
    getCategories(),
    getTransactions({ month, year }),
  ]);

  const categoryTree = buildCategoryTree(categories);

  return (
    <AppClient
      accounts={accounts}
      cards={cards}
      categoryTree={categoryTree}
      initialTransactions={transactions}
      initialMonth={month}
      initialYear={year}
    />
  );
}
