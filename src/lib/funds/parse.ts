import type {
  Fund,
  FundSummary,
  MfApiFundResponse,
  NavPoint,
  OptionType,
  PlanType,
} from "./types";

// "20-11-2026" -> "2026-11-20"
export const toIsoDate = (amfiDate: string): string | null => {
  const [day, month, year] = amfiDate.split("-");
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

export const getPlanType = (schemeName: string): PlanType | null => {
  const name = schemeName.toLowerCase();
  if (name.includes("direct")) return "Direct";
  if (name.includes("regular")) return "Regular";
  return null;
};

export const getOptionType = (schemeName: string): OptionType | null => {
  const name = schemeName.toLowerCase();
  if (name.includes("idcw") || name.includes("dividend")) return "IDCW";
  if (name.includes("growth")) return "Growth";
  return null;
};

export const toFundSummary = (code: number, name: string): FundSummary => ({
  code,
  name,
  plan: getPlanType(name),
  option: getOptionType(name),
});

// Drops rows with bad dates or NAVs (AMFI data has gaps and "0" entries),
// and returns the history oldest first.
export const parseNavHistory = (rows: MfApiFundResponse["data"]): NavPoint[] =>
  rows
    .map((row) => ({ date: toIsoDate(row.date), nav: Number(row.nav) }))
    .filter(
      (point): point is NavPoint =>
        point.date !== null && Number.isFinite(point.nav) && point.nav > 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date));

// Returns null when the scheme does not exist. The API answers unknown codes
// with status SUCCESS, scheme_code 0 and an empty data array, not a 404.
export const toFund = (response: MfApiFundResponse): Fund | null => {
  const { meta } = response;
  if (!meta.scheme_code) return null;

  const navHistory = parseNavHistory(response.data);
  const latest = navHistory.at(-1);
  if (!latest) return null;

  return {
    ...toFundSummary(meta.scheme_code, meta.scheme_name),
    fundHouse: meta.fund_house,
    category: meta.scheme_category,
    schemeType: meta.scheme_type,
    navHistory,
    latest,
  };
};
