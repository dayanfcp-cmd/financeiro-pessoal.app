import { redirect } from "next/navigation";
import { getUser, getAccounts, getCards, getCategories, buildCategoryTree, getTransactions, getCommitments, getReceipts } from "@/lib/data/queries";
import { AppClient } from "@/components/app/AppClient";

export default async function Home() {
  const user = await getUser();
  if (!user) {
    redirect("/entrar");
  }

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const [accounts, cards, categories, transactions, commitments, receipts] = await Promise.all([
    getAccounts(),
    getCards(),
    getCategories(),
    getTransactions({ month, year }),
    getCommitments(),
    getReceipts(),
  ]);

  const categoryTree = buildCategoryTree(categories);

  return (
    <AppClient
      accounts={accounts}
      cards={cards}
      categoryTree={categoryTree}
      initialTransactions={transactions}
      initialCommitments={commitments}
      initialReceipts={receipts}
      initialMonth={month}
      initialYear={year}
    />
  );
}
