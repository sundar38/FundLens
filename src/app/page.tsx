import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPopularFunds } from "@/lib/funds/api";
import {
  formatDate,
  formatNav,
  getShortCategory,
  getShortFundName,
} from "@/lib/format";

const HomePage = async () => {
  const popularFunds = await getPopularFunds();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-16">
      <section className="flex flex-col items-start gap-6">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Explore Indian mutual funds, clearly.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Search thousands of funds, see their NAV history, plan a SIP and ask
          an AI assistant about any fund.
        </p>
        <Link href="/funds" className={buttonVariants({ size: "lg" })}>
          Browse funds
        </Link>
      </section>

      <section aria-labelledby="popular-funds" className="flex flex-col gap-4">
        <h2 id="popular-funds" className="text-xl font-semibold">
          Popular funds
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {popularFunds.map((fund) => (
            <li key={fund.code}>
              <Link href={`/funds/${fund.code}`} className="block h-full">
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle>{getShortFundName(fund.name)}</CardTitle>
                    <CardDescription>
                      {fund.fundHouse} · {getShortCategory(fund.category)}
                    </CardDescription>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="font-medium">
                        {formatNav(fund.latest.nav)}
                      </span>
                      <span className="text-muted-foreground">
                        on {formatDate(fund.latest.date)}
                      </span>
                      {fund.plan && <Badge variant="secondary">{fund.plan}</Badge>}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};

export default HomePage;
