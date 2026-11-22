import { describe, expect, it } from "vitest";
import {
  addMonths,
  getCalendarYearReturns,
  getMaxDrawdown,
  findIndexOnOrAfter,
  findIndexOnOrBefore,
  getAvailableSipYears,
  getFundReturns,
  getPeriodReturn,
  simulateSip,
  xirr,
} from "./returns";
import type { NavPoint } from "./types";

// Daily NAVs (weekdays only, like real AMFI data) growing at a steady
// `annualRate`, so expected returns are known up front.
const makeHistory = (startIso: string, endIso: string, annualRate: number, startNav = 10) => {
  const start = new Date(`${startIso}T00:00:00Z`).getTime();
  const end = new Date(`${endIso}T00:00:00Z`).getTime();
  const history: NavPoint[] = [];
  for (let time = start; time <= end; time += 24 * 60 * 60 * 1000) {
    const date = new Date(time);
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const years = (time - start) / (365 * 24 * 60 * 60 * 1000);
    history.push({
      date: date.toISOString().slice(0, 10),
      nav: startNav * (1 + annualRate) ** years,
    });
  }
  return history;
};

describe("addMonths", () => {
  it("moves by whole months", () => {
    expect(addMonths("2026-11-20", -12)).toBe("2025-11-20");
    expect(addMonths("2026-11-20", 2)).toBe("2027-01-20");
  });

  it("clamps to the last day of shorter months", () => {
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
  });
});

describe("finding NAVs around holidays and weekends", () => {
  const history: NavPoint[] = [
    { date: "2026-11-13", nav: 10 }, // Friday
    { date: "2026-11-16", nav: 11 }, // Monday
    { date: "2026-11-17", nav: 12 },
  ];

  it("finds the last NAV on or before a date", () => {
    expect(findIndexOnOrBefore(history, "2026-11-15")).toBe(0);
    expect(findIndexOnOrBefore(history, "2026-11-16")).toBe(1);
    expect(findIndexOnOrBefore(history, "2026-11-01")).toBe(-1);
  });

  it("finds the first NAV on or after a date", () => {
    expect(findIndexOnOrAfter(history, "2026-11-14")).toBe(1);
    expect(findIndexOnOrAfter(history, "2026-11-13")).toBe(0);
    expect(findIndexOnOrAfter(history, "2026-11-18")).toBe(-1);
  });
});

describe("getPeriodReturn", () => {
  const history = makeHistory("2016-01-01", "2026-11-20", 0.12);

  it("gives the annualised (CAGR) return over the period", () => {
    const threeYear = getPeriodReturn(history, 3);
    expect(threeYear?.annualized).toBeCloseTo(0.12, 2);
    expect(threeYear?.absolute).toBeCloseTo(1.12 ** 3 - 1, 2);
  });

  it("returns null when the fund is younger than the period", () => {
    expect(getPeriodReturn(history, 15)).toBeNull();
  });

  it("reports every period for a long-running fund", () => {
    const returns = getFundReturns(history);
    expect(returns.oneYear?.annualized).toBeCloseTo(0.12, 2);
    expect(returns.fiveYear?.annualized).toBeCloseTo(0.12, 2);
    expect(returns.sinceLaunch?.annualized).toBeCloseTo(0.12, 2);
  });
});

describe("xirr", () => {
  it("matches a simple one-year investment", () => {
    expect(
      xirr([
        { date: "2024-01-01", amount: -100 },
        { date: "2024-12-31", amount: 110 },
      ]),
    ).toBeCloseTo(0.1, 6);
  });

  it("handles losses", () => {
    expect(
      xirr([
        { date: "2024-01-01", amount: -100 },
        { date: "2024-12-31", amount: 80 },
      ]),
    ).toBeCloseTo(-0.2, 6);
  });

  it("returns null without enough cash flows", () => {
    expect(xirr([{ date: "2024-01-01", amount: -100 }])).toBeNull();
  });
});

describe("simulateSip", () => {
  it("invests once a month for the whole period", () => {
    const history = makeHistory("2016-01-01", "2026-11-20", 0.12);
    const result = simulateSip(history, 5000, 3);
    expect(result?.installments).toBe(36);
    expect(result?.invested).toBe(180_000);
  });

  it("earns the fund's growth rate as XIRR", () => {
    const history = makeHistory("2016-01-01", "2026-11-20", 0.12);
    expect(simulateSip(history, 10_000, 5)?.xirr).toBeCloseTo(0.12, 2);
  });

  it("is worth exactly what was invested when the NAV never moves", () => {
    const history = makeHistory("2020-01-01", "2026-11-20", 0);
    const result = simulateSip(history, 1000, 1);
    expect(result?.currentValue).toBeCloseTo(12_000, 6);
    expect(result?.gain).toBeCloseTo(0, 6);
  });

  it("returns null when the fund is too young for the duration", () => {
    const history = makeHistory("2026-01-01", "2026-11-20", 0.1);
    expect(simulateSip(history, 1000, 1)).toBeNull();
  });

  it("returns null for a non-positive amount", () => {
    const history = makeHistory("2020-01-01", "2026-11-20", 0.1);
    expect(simulateSip(history, 0, 1)).toBeNull();
  });
});

describe("getAvailableSipYears", () => {
  it("offers only durations the fund has history for", () => {
    const history = makeHistory("2022-06-01", "2026-11-20", 0.1);
    expect(getAvailableSipYears(history, [1, 3, 5, 10])).toEqual([1, 3]);
  });
});

describe("getCalendarYearReturns", () => {
  it("measures each full calendar year and marks the current one as year-to-date", () => {
    const history = makeHistory("2022-06-01", "2026-11-20", 0.1);
    const years = getCalendarYearReturns(history);
    expect(years.map((year) => year.year)).toEqual([2023, 2024, 2025, 2026]);
    expect(years[0].return).toBeCloseTo(0.1, 2);
    expect(years[0].isYearToDate).toBe(false);
    expect(years.at(-1)?.isYearToDate).toBe(true);
  });
});

describe("getMaxDrawdown", () => {
  const history: NavPoint[] = [
    { date: "2024-01-01", nav: 10 },
    { date: "2024-02-01", nav: 20 }, // peak
    { date: "2024-03-01", nav: 15 },
    { date: "2024-04-01", nav: 12 }, // trough: -40%
    { date: "2024-05-01", nav: 18 },
    { date: "2024-06-01", nav: 21 }, // back above the peak
  ];

  it("finds the largest peak-to-trough fall and when it recovered", () => {
    expect(getMaxDrawdown(history)).toEqual({
      fall: -0.4,
      peakDate: "2024-02-01",
      troughDate: "2024-04-01",
      recoveryDate: "2024-06-01",
    });
  });

  it("reports no recovery while the NAV is still below the old peak", () => {
    expect(getMaxDrawdown(history.slice(0, 5))?.recoveryDate).toBeNull();
  });

  it("returns null for a NAV that never fell", () => {
    expect(getMaxDrawdown(makeHistory("2024-01-01", "2024-12-31", 0.1))).toBeNull();
  });
});
