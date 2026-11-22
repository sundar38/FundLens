import { formatDate, formatPercent } from "@/lib/format";
import type { FundReturns as FundReturnsData, PeriodReturn } from "@/lib/funds/returns";

type FundReturnsProps = {
  returns: FundReturnsData;
};

// A server component: returns are calculated on the server, so this section
// ships no JavaScript to the browser.
const FundReturns = ({ returns }: FundReturnsProps) => {
  const cards: { label: string; detail: string; value: PeriodReturn | null }[] = [
    { label: "1 year", detail: "absolute return", value: returns.oneYear },
    { label: "3 years", detail: "a year (CAGR)", value: returns.threeYear },
    { label: "5 years", detail: "a year (CAGR)", value: returns.fiveYear },
    { label: "Since launch", detail: "a year (CAGR)", value: returns.sinceLaunch },
  ];

  return (
    <section aria-labelledby="returns-heading" className="flex flex-col gap-3">
      <h2 id="returns-heading" className="font-semibold">
        Returns
      </h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <li key={card.label} className="flex flex-col gap-1 rounded-lg border p-4">
            <span className="text-sm text-muted-foreground">{card.label}</span>
            {card.value ? (
              <>
                <span
                  className={`text-2xl font-semibold ${
                    card.value.annualized >= 0 ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {formatPercent(card.value.annualized)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {card.detail}, from {formatDate(card.value.startDate)}
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-semibold text-muted-foreground">—</span>
                <span className="text-xs text-muted-foreground">Not enough history</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default FundReturns;
