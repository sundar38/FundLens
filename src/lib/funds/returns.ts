import type { NavPoint } from "./types";

// Pure functions only: no React, no Next.js. Every function takes the NAV
// history oldest first (as returned by parseNavHistory).

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_PER_YEAR = 365;

const toUtcDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00Z`);
const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

export const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((toUtcDate(toIso).getTime() - toUtcDate(fromIso).getTime()) / DAY_MS);

// Moves a date by whole months, clamping to the month's last day
// (31 Mar - 1 month = 28/29 Feb, not 3 Mar).
export const addMonths = (isoDate: string, months: number): string => {
  const date = toUtcDate(isoDate);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDayOfMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDayOfMonth));
  return toIsoDate(date);
};

// Index of the last NAV on or before the date, or -1 if there is none.
// NAVs are missing on weekends and holidays, so exact matches are rare.
export const findIndexOnOrBefore = (history: NavPoint[], isoDate: string): number => {
  let low = 0;
  let high = history.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (history[mid].date <= isoDate) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
};

// Index of the first NAV on or after the date, or -1 if there is none.
export const findIndexOnOrAfter = (history: NavPoint[], isoDate: string): number => {
  const before = findIndexOnOrBefore(history, isoDate);
  if (before !== -1 && history[before].date === isoDate) return before;
  return before + 1 < history.length ? before + 1 : -1;
};

export type PeriodReturn = {
  startDate: string;
  // 0.12 = 12%
  absolute: number;
  // Compound annual growth rate; equals `absolute` for periods up to a year
  annualized: number;
};

// Point-to-point return over the last `years`, or null if the fund is younger.
export const getPeriodReturn = (history: NavPoint[], years: number): PeriodReturn | null => {
  const latest = history.at(-1);
  if (!latest) return null;

  const targetStart = addMonths(latest.date, -12 * years);
  const startIndex = findIndexOnOrBefore(history, targetStart);
  if (startIndex === -1) return null;

  const start = history[startIndex];
  const absolute = latest.nav / start.nav - 1;
  const annualized = years > 1 ? (1 + absolute) ** (1 / years) - 1 : absolute;
  return { startDate: start.date, absolute, annualized };
};

export const getSinceLaunchReturn = (history: NavPoint[]): PeriodReturn | null => {
  const first = history[0];
  const latest = history.at(-1);
  if (!first || !latest || first === latest) return null;

  const years = daysBetween(first.date, latest.date) / DAYS_PER_YEAR;
  const absolute = latest.nav / first.nav - 1;
  const annualized = years > 1 ? (1 + absolute) ** (1 / years) - 1 : absolute;
  return { startDate: first.date, absolute, annualized };
};

export type FundReturns = {
  oneYear: PeriodReturn | null;
  threeYear: PeriodReturn | null;
  fiveYear: PeriodReturn | null;
  sinceLaunch: PeriodReturn | null;
};

export const getFundReturns = (history: NavPoint[]): FundReturns => ({
  oneYear: getPeriodReturn(history, 1),
  threeYear: getPeriodReturn(history, 3),
  fiveYear: getPeriodReturn(history, 5),
  sinceLaunch: getSinceLaunchReturn(history),
});

export type CashFlow = { date: string; amount: number };

// Annualised return for irregular cash flows (what Excel's XIRR does).
// Investments are negative amounts, the final value is positive.
// Newton's method first; falls back to bisection if it doesn't converge.
export const xirr = (cashFlows: CashFlow[]): number | null => {
  if (cashFlows.length < 2) return null;
  const firstDate = cashFlows[0].date;
  const flows = cashFlows.map((flow) => ({
    years: daysBetween(firstDate, flow.date) / DAYS_PER_YEAR,
    amount: flow.amount,
  }));

  const npv = (rate: number) =>
    flows.reduce((sum, flow) => sum + flow.amount / (1 + rate) ** flow.years, 0);
  const npvDerivative = (rate: number) =>
    flows.reduce(
      (sum, flow) => sum - (flow.years * flow.amount) / (1 + rate) ** (flow.years + 1),
      0,
    );

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const value = npv(rate);
    if (Math.abs(value) < 1e-7) return rate;
    const slope = npvDerivative(rate);
    if (slope === 0) break;
    const next = rate - value / slope;
    if (!Number.isFinite(next) || next <= -0.999) break;
    rate = next;
  }

  let low = -0.999;
  let high = 10;
  if (npv(low) * npv(high) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    if (npv(low) * npv(mid) <= 0) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
};

export type SipResult = {
  installments: number;
  invested: number;
  currentValue: number;
  gain: number;
  // Annualised return of the SIP (XIRR), e.g. 0.14 = 14% a year
  xirr: number | null;
  startDate: string;
  endDate: string;
};

// Backtests a monthly SIP over the last `years` using real NAVs: each month's
// instalment buys units at the first NAV on or after the SIP date.
// Ignores stamp duty, exit loads and taxes.
export const simulateSip = (
  history: NavPoint[],
  monthlyAmount: number,
  years: number,
): SipResult | null => {
  const latest = history.at(-1);
  if (!latest || monthlyAmount <= 0 || years <= 0) return null;

  const startDate = addMonths(latest.date, -12 * years);
  if (history[0].date > startDate) return null;

  let units = 0;
  let invested = 0;
  const cashFlows: CashFlow[] = [];

  for (let month = 0; month < 12 * years; month++) {
    const index = findIndexOnOrAfter(history, addMonths(startDate, month));
    if (index === -1) break;
    const { date, nav } = history[index];
    units += monthlyAmount / nav;
    invested += monthlyAmount;
    cashFlows.push({ date, amount: -monthlyAmount });
  }

  const currentValue = units * latest.nav;
  cashFlows.push({ date: latest.date, amount: currentValue });

  return {
    installments: cashFlows.length - 1,
    invested,
    currentValue,
    gain: currentValue - invested,
    xirr: xirr(cashFlows),
    startDate,
    endDate: latest.date,
  };
};

// Years of SIP history the fund can support, from the given options.
export const getAvailableSipYears = (history: NavPoint[], options: number[]): number[] => {
  const latest = history.at(-1);
  if (!latest) return [];
  return options.filter((years) => history[0].date <= addMonths(latest.date, -12 * years));
};

export type CalendarYearReturn = {
  year: number;
  // 0.12 = 12%
  return: number;
  // true for the current, unfinished year (return so far)
  isYearToDate: boolean;
};

// Return for each calendar year: last NAV of the previous year to last NAV of
// the year. The first, partial year of a fund is skipped.
export const getCalendarYearReturns = (history: NavPoint[]): CalendarYearReturn[] => {
  const first = history[0];
  const latest = history.at(-1);
  if (!first || !latest) return [];

  const firstYear = Number(first.date.slice(0, 4)) + 1;
  const lastYear = Number(latest.date.slice(0, 4));
  const results: CalendarYearReturn[] = [];

  for (let year = firstYear; year <= lastYear; year++) {
    const startIndex = findIndexOnOrBefore(history, `${year - 1}-12-31`);
    const endIndex = findIndexOnOrBefore(history, `${year}-12-31`);
    if (startIndex === -1 || endIndex <= startIndex) continue;
    results.push({
      year,
      return: history[endIndex].nav / history[startIndex].nav - 1,
      isYearToDate: year === lastYear && !latest.date.endsWith("-12-31"),
    });
  }
  return results;
};

export type Drawdown = {
  // Largest peak-to-trough fall, e.g. -0.32 = fell 32%
  fall: number;
  peakDate: string;
  troughDate: string;
  // First date the NAV got back to the old peak, or null if it hasn't yet
  recoveryDate: string | null;
};

export const getMaxDrawdown = (history: NavPoint[]): Drawdown | null => {
  if (history.length < 2) return null;

  let peakIndex = 0;
  let worst = { fall: 0, peakIndex: 0, troughIndex: 0 };

  history.forEach((point, index) => {
    if (point.nav > history[peakIndex].nav) peakIndex = index;
    const fall = point.nav / history[peakIndex].nav - 1;
    if (fall < worst.fall) worst = { fall, peakIndex, troughIndex: index };
  });

  if (worst.fall === 0) return null;

  const peak = history[worst.peakIndex];
  const recovery = history
    .slice(worst.troughIndex + 1)
    .find((point) => point.nav >= peak.nav);

  return {
    fall: worst.fall,
    peakDate: peak.date,
    troughDate: history[worst.troughIndex].date,
    recoveryDate: recovery?.date ?? null,
  };
};
