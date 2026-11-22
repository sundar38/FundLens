import { describe, expect, it } from "vitest";
import {
  getOptionType,
  getPlanType,
  parseNavHistory,
  toFund,
  toIsoDate,
} from "./parse";
import type { MfApiFundResponse } from "./types";

const makeResponse = (overrides: Partial<MfApiFundResponse> = {}): MfApiFundResponse => ({
  meta: {
    fund_house: "PPFAS Mutual Fund",
    scheme_type: "Open Ended Schemes",
    scheme_category: "Equity Scheme - Flexi Cap Fund",
    scheme_code: 122639,
    scheme_name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
    isin_growth: "INF879O01027",
    isin_div_reinvestment: null,
  },
  data: [
    { date: "20-11-2026", nav: "95.45850" },
    { date: "19-11-2026", nav: "94.69450" },
  ],
  status: "SUCCESS",
  ...overrides,
});

describe("toIsoDate", () => {
  it("converts AMFI dd-mm-yyyy dates to ISO", () => {
    expect(toIsoDate("20-11-2026")).toBe("2026-11-20");
    expect(toIsoDate("1-2-2024")).toBe("2024-02-01");
  });

  it("returns null for malformed dates", () => {
    expect(toIsoDate("2026/11/20")).toBeNull();
    expect(toIsoDate("")).toBeNull();
  });
});

describe("plan and option detection", () => {
  it.each([
    ["Parag Parikh Flexi Cap Fund - Direct Plan - Growth", "Direct", "Growth"],
    ["HDFC Flexi Cap Fund - Regular Plan - IDCW", "Regular", "IDCW"],
    ["Some Old Fund - Dividend Payout", null, "IDCW"],
    ["Nifty ETF", null, null],
  ])("reads %s", (name, plan, option) => {
    expect(getPlanType(name)).toBe(plan);
    expect(getOptionType(name)).toBe(option);
  });
});

describe("parseNavHistory", () => {
  it("sorts oldest first and converts NAVs to numbers", () => {
    const history = parseNavHistory(makeResponse().data);
    expect(history).toEqual([
      { date: "2026-11-19", nav: 94.6945 },
      { date: "2026-11-20", nav: 95.4585 },
    ]);
  });

  it("drops rows with bad dates, zero or non-numeric NAVs", () => {
    const history = parseNavHistory([
      { date: "20-11-2026", nav: "10.5" },
      { date: "bad", nav: "10.1" },
      { date: "18-11-2026", nav: "0.00000" },
      { date: "17-11-2026", nav: "N.A." },
    ]);
    expect(history).toEqual([{ date: "2026-11-20", nav: 10.5 }]);
  });
});

describe("toFund", () => {
  it("maps the API response to the app's Fund shape", () => {
    const fund = toFund(makeResponse());
    expect(fund).toMatchObject({
      code: 122639,
      plan: "Direct",
      option: "Growth",
      fundHouse: "PPFAS Mutual Fund",
      latest: { date: "2026-11-20", nav: 95.4585 },
    });
    expect(fund?.navHistory).toHaveLength(2);
  });

  it("returns null for unknown schemes (the API answers them with scheme_code 0)", () => {
    const response = makeResponse({ data: [] });
    response.meta.scheme_code = 0;
    expect(toFund(response)).toBeNull();
  });

  it("returns null when there are no usable NAVs", () => {
    expect(toFund(makeResponse({ data: [{ date: "x", nav: "0" }] }))).toBeNull();
  });
});
