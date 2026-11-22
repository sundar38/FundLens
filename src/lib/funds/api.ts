import { cacheLife, cacheTag } from "next/cache";
import { toFund, toFundSummary } from "./parse";
import type {
  Fund,
  FundOverview,
  FundSummary,
  MfApiFundResponse,
  MfApiSearchResult,
} from "./types";

// Overridable so end-to-end tests can point the app at a local mock API
// instead of depending on the real one being up and its data never changing.
const MF_API = process.env.MF_API_BASE_URL ?? "https://api.mfapi.in/mf";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_SEARCH_RESULTS = 30;

// Popular direct-growth funds. These pages are pre-built at build time (SSG);
// every other fund page is built on its first visit and then cached (ISR).
export const POPULAR_FUND_CODES = [
  122639, // Parag Parikh Flexi Cap
  120716, // UTI Nifty 50 Index
  118955, // HDFC Flexi Cap
  125497, // SBI Small Cap
  118825, // Mirae Asset Large Cap
  120586, // ICICI Prudential Large Cap
  120503, // Axis ELSS Tax Saver
  118778, // Nippon India Small Cap
];

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Fund API request failed: ${response.status} ${url}`);
  }
  return response.json() as Promise<T>;
};

// NAVs are published once a day, so fund data is cached for a day.
export const getFund = async (code: number): Promise<Fund | null> => {
  "use cache";
  cacheLife("days");
  cacheTag(`fund-${code}`);

  if (!Number.isInteger(code) || code <= 0) return null;

  const response = await fetchJson<MfApiFundResponse>(`${MF_API}/${code}`);
  return toFund(response);
};

export const searchFunds = async (query: string): Promise<FundSummary[]> => {
  "use cache";
  cacheLife("days");

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const results = await fetchJson<MfApiSearchResult[]>(
    `${MF_API}/search?q=${encodeURIComponent(trimmed)}`,
  );

  return results
    .slice(0, MAX_SEARCH_RESULTS)
    .map((result) => toFundSummary(result.schemeCode, result.schemeName));
};

// The home page only needs each fund's name and latest NAV, so the full
// NAV history is dropped to keep this cache entry small.
export const getPopularFunds = async (): Promise<FundOverview[]> => {
  "use cache";
  cacheLife("days");

  const funds = await Promise.all(POPULAR_FUND_CODES.map(getFund));
  return funds
    .filter((fund): fund is Fund => fund !== null)
    .map(({ code, name, plan, option, fundHouse, category, schemeType, latest }) => ({
      code,
      name,
      plan,
      option,
      fundHouse,
      category,
      schemeType,
      latest,
    }));
};
