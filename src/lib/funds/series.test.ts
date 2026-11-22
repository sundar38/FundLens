import { describe, expect, it } from "vitest";
import { downsample, getAvailableRanges, getRangeSeries } from "./series";
import type { NavPoint } from "./types";

const makeDailyHistory = (days: number, startIso = "2020-01-01"): NavPoint[] => {
  const start = new Date(`${startIso}T00:00:00Z`).getTime();
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(start + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    nav: 10 + i,
  }));
};

describe("downsample", () => {
  it("leaves short series untouched", () => {
    const points = makeDailyHistory(50);
    expect(downsample(points, 100)).toBe(points);
  });

  it("caps the number of points and keeps the first and last", () => {
    const points = makeDailyHistory(3000);
    const result = downsample(points, 400);
    expect(result).toHaveLength(400);
    expect(result[0]).toBe(points[0]);
    expect(result.at(-1)).toBe(points.at(-1));
  });
});

describe("chart ranges", () => {
  it("offers only ranges the fund has history for", () => {
    const twoYears = makeDailyHistory(730);
    expect(getAvailableRanges(twoYears)).toEqual(["6M", "1Y", "MAX"]);
  });

  it("slices the history to the selected range", () => {
    const history = makeDailyHistory(1000);
    const series = getRangeSeries(history, "6M");
    const latest = history.at(-1)!;
    expect(series.at(-1)).toEqual(latest);
    // Last day is 2022-09-26, so 6 months back is 2022-03-26
    expect(series[0].date).toBe("2022-03-26");
    expect(series.length).toBeLessThan(200);
  });
});
