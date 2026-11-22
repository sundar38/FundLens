import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import FundAnalysis from "@/components/funds/fund-analysis";
import FundChat from "@/components/funds/fund-chat";
import { isAiEnabled } from "@/lib/ai/config";
import FundReturns from "@/components/funds/fund-returns";
import { getFund, POPULAR_FUND_CODES } from "@/lib/funds/api";
import { getFundReturns } from "@/lib/funds/returns";
import {
  formatDate,
  formatNav,
  getShortCategory,
  getShortFundName,
} from "@/lib/format";

type FundPageProps = PageProps<"/funds/[code]">;

// SSG: popular funds are pre-rendered at build time. Any other fund code is
// rendered on its first visit and then cached (ISR), refreshed daily by
// cacheLife("days") in getFund.
export const generateStaticParams = async () =>
  POPULAR_FUND_CODES.map((code) => ({ code: String(code) }));

export const generateMetadata = async ({ params }: FundPageProps): Promise<Metadata> => {
  const fund = await getFund(Number((await params).code));
  if (!fund) return { title: "Fund not found" };

  return {
    title: getShortFundName(fund.name),
    description: `${fund.name} by ${fund.fundHouse}: latest NAV ${formatNav(
      fund.latest.nav,
    )} on ${formatDate(fund.latest.date)}, NAV history and returns.`,
  };
};

// params is awaited inside <Suspense>, so a fund that wasn't pre-rendered
// still gets the page shell instantly while its data streams in.
const FundDetails = async ({ params }: Pick<FundPageProps, "params">) => {
  const fund = await getFund(Number((await params).code));
  if (!fund) notFound();

  const firstNav = fund.navHistory[0];
  const facts = [
    { label: "Latest NAV", value: formatNav(fund.latest.nav) },
    { label: "NAV date", value: formatDate(fund.latest.date) },
    { label: "NAV data since", value: formatDate(firstNav.date) },
    { label: "Scheme type", value: fund.schemeType },
  ];

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge>{getShortCategory(fund.category)}</Badge>
          {fund.plan && <Badge variant="secondary">{fund.plan}</Badge>}
          {fund.option && <Badge variant="outline">{fund.option}</Badge>}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {getShortFundName(fund.name)}
        </h1>
        <p className="text-muted-foreground">
          {fund.fundHouse} · {fund.name}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">{fact.label}</dt>
            <dd className="font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <FundReturns returns={getFundReturns(fund.navHistory)} />
      <FundAnalysis navHistory={fund.navHistory} />
      {isAiEnabled() && (
        <FundChat fundCode={fund.code} fundName={getShortFundName(fund.name)} />
      )}
    </article>
  );
};

const FundDetailsSkeleton = () => (
  <div role="status" aria-busy className="flex flex-col gap-8">
    <span className="sr-only">Loading fund details…</span>
    <div className="flex flex-col gap-3">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
    </div>
    <Skeleton className="h-24 w-full" />
  </div>
);

const FundPage = (props: FundPageProps) => {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <Link href="/funds" className="text-sm text-muted-foreground hover:text-foreground">
        ← Search funds
      </Link>
      <Suspense fallback={<FundDetailsSkeleton />}>
        <FundDetails params={props.params} />
      </Suspense>
    </main>
  );
};

export default FundPage;
