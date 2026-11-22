import { addMonths, findIndexOnOrBefore } from "./returns";
import type { NavPoint } from "./types";

export type ChartRange = "6M" | "1Y" | "3Y" | "5Y" | "MAX";

export const CHART_RANGES: { value: ChartRange; months: number | null }[] = [
  { value: "6M", months: 6 },
  { value: "1Y", months: 12 },
  { value: "3Y", months: 36 },
  { value: "5Y", months: 60 },
  { value: "MAX", months: null },
];

// A chart a few hundred pixels wide can't show more points than this anyway;
// fewer points keep rendering and tooltips fast.
const MAX_CHART_POINTS = 400;

// Keeps every nth point, always including the first and last.
export const downsample = (points: NavPoint[], maxPoints = MAX_CHART_POINTS): NavPoint[] => {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, i) => points[Math.round(i * step)]);
};

export const getRangeSeries = (history: NavPoint[], range: ChartRange): NavPoint[] => {
  const latest = history.at(-1);
  const months = CHART_RANGES.find((option) => option.value === range)?.months;
  if (!latest || months == null) return downsample(history);

  const startIndex = Math.max(
    0,
    findIndexOnOrBefore(history, addMonths(latest.date, -months)),
  );
  return downsample(history.slice(startIndex));
};

// Ranges the fund has enough history for (MAX is always available).
export const getAvailableRanges = (history: NavPoint[]): ChartRange[] => {
  const latest = history.at(-1);
  if (!latest) return [];
  return CHART_RANGES.filter(
    ({ months }) => months === null || history[0].date <= addMonths(latest.date, -months),
  ).map(({ value }) => value);
};
