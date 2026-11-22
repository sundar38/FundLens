"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import SegmentedControl from "@/components/funds/segmented-control";
import { formatDate, formatPercent, formatRupees } from "@/lib/format";
import { getAvailableSipYears, simulateSip } from "@/lib/funds/returns";
import type { NavPoint } from "@/lib/funds/types";

type SipCalculatorProps = {
  navHistory: NavPoint[];
};

const SIP_YEAR_OPTIONS = [1, 3, 5, 10];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 10_00_000;
const DEFAULT_AMOUNT = 10_000;

const SipCalculator = ({ navHistory }: SipCalculatorProps) => {
  const yearOptions = useMemo(
    () => getAvailableSipYears(navHistory, SIP_YEAR_OPTIONS),
    [navHistory],
  );
  const [amountInput, setAmountInput] = useState(String(DEFAULT_AMOUNT));
  const [years, setYears] = useState(
    yearOptions.includes(5) ? 5 : (yearOptions.at(-1) ?? 1),
  );

  const amount = Number(amountInput);
  const isAmountValid =
    Number.isFinite(amount) && amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;

  const result = useMemo(
    () => (isAmountValid ? simulateSip(navHistory, amount, years) : null),
    [navHistory, amount, years, isAmountValid],
  );

  if (yearOptions.length === 0) {
    return (
      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">SIP backtest</h2>
        <p className="text-sm text-muted-foreground">
          This fund has less than a year of NAV history, so a SIP backtest isn’t available yet.
        </p>
      </section>
    );
  }

  const stats = result && [
    { label: "Total invested", value: formatRupees(result.invested) },
    { label: "Value today", value: formatRupees(result.currentValue) },
    {
      label: "Gain",
      value: `${formatRupees(result.gain)} (${formatPercent(result.gain / result.invested)})`,
    },
    {
      label: "Annualised return (XIRR)",
      value: result.xirr === null ? "—" : formatPercent(result.xirr),
    },
  ];

  return (
    <section aria-labelledby="sip-heading" className="flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <h2 id="sip-heading" className="font-semibold">
          SIP backtest
        </h2>
        <p className="text-sm text-muted-foreground">
          What a monthly SIP in this fund would be worth today, using its real past NAVs.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sip-amount" className="text-sm font-medium">
            Monthly amount (₹)
          </label>
          <Input
            id="sip-amount"
            type="number"
            inputMode="numeric"
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            step={500}
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            aria-invalid={!isAmountValid}
            aria-describedby="sip-amount-help"
            className="h-9 w-40"
          />
          <span
            id="sip-amount-help"
            className={isAmountValid ? "sr-only" : "text-sm text-red-700"}
          >
            Enter an amount between {formatRupees(MIN_AMOUNT)} and {formatRupees(MAX_AMOUNT)}.
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Duration</span>
          <SegmentedControl
            label="SIP duration"
            options={yearOptions.map((value) => ({
              value,
              label: `${value}Y`,
            }))}
            value={years}
            onChange={setYears}
          />
        </div>
      </div>

      {result && stats && (
        <div aria-live="polite" className="flex flex-col gap-3">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                <dd className="font-medium">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">
            {result.installments} monthly instalments from {formatDate(result.startDate)} to{" "}
            {formatDate(result.endDate)}, each bought at that day’s NAV (or the next available
            one). Past returns don’t guarantee future returns. Excludes stamp duty, exit load
            and taxes.
          </p>
        </div>
      )}
    </section>
  );
};

export default SipCalculator;
