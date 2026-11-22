import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import FundSearchForm from "@/components/funds/fund-search-form";
import { searchFunds } from "@/lib/funds/api";
import { getShortFundName } from "@/lib/format";

export const metadata: Metadata = {
  title: "Search funds",
  description: "Search Indian mutual funds by name.",
};

const getQuery = (q: string | string[] | undefined): string =>
  (Array.isArray(q) ? q[0] : q)?.trim() ?? "";

// Reads ?q= from the request, so this part renders on the server per request
// (SSR). Everything outside it is prerendered into the static shell.
const FundSearchResults = async ({
  searchParams,
}: Pick<PageProps<"/funds">, "searchParams">) => {
  const query = getQuery((await searchParams).q);
  const funds = await searchFunds(query);

  return (
    <>
      <FundSearchForm defaultQuery={query} />

      {query.length < 2 ? (
        <p className="text-muted-foreground">
          Type at least 2 letters of a fund name to search.
        </p>
      ) : (
        <section aria-labelledby="search-results" className="flex flex-col gap-3">
          <h2 id="search-results" className="text-sm text-muted-foreground" aria-live="polite">
            {funds.length === 0
              ? `No funds found for “${query}”.`
              : `${funds.length} fund${funds.length === 1 ? "" : "s"} found for “${query}”`}
          </h2>
          <ul className="divide-y rounded-lg border">
            {funds.map((fund) => (
              <li key={fund.code}>
                <Link
                  href={`/funds/${fund.code}`}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{getShortFundName(fund.name)}</span>
                    <span className="text-sm text-muted-foreground">{fund.name}</span>
                  </span>
                  <span className="flex shrink-0 gap-1.5">
                    {fund.plan && <Badge variant="secondary">{fund.plan}</Badge>}
                    {fund.option && <Badge variant="outline">{fund.option}</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
};

const FundSearchResultsSkeleton = () => (
  <>
    <FundSearchForm disabled />
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  </>
);

const FundsPage = (props: PageProps<"/funds">) => {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Search funds</h1>
      <Suspense fallback={<FundSearchResultsSkeleton />}>
        <FundSearchResults searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
};

export default FundsPage;
