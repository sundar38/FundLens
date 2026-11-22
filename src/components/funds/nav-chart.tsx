"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SegmentedControl from "@/components/funds/segmented-control";
import { formatDate, formatNav, formatPercent, formatShortDate } from "@/lib/format";
import { getAvailableRanges, getRangeSeries, type ChartRange } from "@/lib/funds/series";
import type { NavPoint } from "@/lib/funds/types";

type NavChartProps = {
  navHistory: NavPoint[];
};

type TooltipContentProps = {
  active?: boolean;
  payload?: { payload: NavPoint }[];
};

const NavTooltip = ({ active, payload }: TooltipContentProps) => {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
      <div className="font-medium">{formatNav(point.nav)}</div>
      <div className="text-muted-foreground">{formatDate(point.date)}</div>
    </div>
  );
};

const NavChart = ({ navHistory }: NavChartProps) => {
  const ranges = useMemo(() => getAvailableRanges(navHistory), [navHistory]);
  const [range, setRange] = useState<ChartRange>(ranges.includes("1Y") ? "1Y" : "MAX");
  const series = useMemo(() => getRangeSeries(navHistory, range), [navHistory, range]);

  const first = series[0];
  const last = series.at(-1);
  if (!first || !last) return null;

  const change = last.nav / first.nav - 1;
  const summary = `NAV went from ${formatNav(first.nav)} on ${formatDate(first.date)} to ${formatNav(
    last.nav,
  )} on ${formatDate(last.date)}, a change of ${formatPercent(change)}.`;

  return (
    <section aria-labelledby="nav-chart-heading" className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="nav-chart-heading" className="font-semibold">
            NAV history
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className={change >= 0 ? "text-emerald-700" : "text-red-700"}>
              {formatPercent(change)}
            </span>{" "}
            since {formatDate(first.date)}
          </p>
        </div>
        <SegmentedControl
          label="Chart range"
          options={ranges.map((value) => ({ value, label: value === "MAX" ? "Max" : value }))}
          value={range}
          onChange={setRange}
        />
      </div>

      <figure className="m-0">
        {/* The chart is visual only: screen readers get the text summary in
            the figcaption, so Recharts' own keyboard layer is turned off. */}
        <div className="h-72 w-full" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={series}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              accessibilityLayer={false}
            >
              <defs>
                <linearGradient id="nav-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                minTickGap={40}
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(nav: number) => `₹${Math.round(nav)}`}
                width={56}
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <Tooltip content={<NavTooltip />} />
              <Area
                type="monotone"
                dataKey="nav"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#nav-fill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="sr-only">{summary}</figcaption>
      </figure>
    </section>
  );
};

export default NavChart;
