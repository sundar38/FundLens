// Raw shapes returned by https://api.mfapi.in (AMFI data).
// NAVs come as strings and dates as "dd-mm-yyyy", newest first.

export type MfApiSearchResult = {
  schemeCode: number;
  schemeName: string;
};

export type MfApiFundResponse = {
  meta: {
    fund_house: string;
    scheme_type: string;
    scheme_category: string;
    scheme_code: number;
    scheme_name: string;
    isin_growth: string | null;
    isin_div_reinvestment: string | null;
  };
  data: { date: string; nav: string }[];
  status: string;
};

// App shapes: cleaned up, typed and safe to pass from server to client components.

export type PlanType = "Direct" | "Regular";
export type OptionType = "Growth" | "IDCW";

export type FundSummary = {
  code: number;
  name: string;
  plan: PlanType | null;
  option: OptionType | null;
};

export type NavPoint = {
  // ISO date, "yyyy-mm-dd" (a string, so it can be cached and sent to the client)
  date: string;
  nav: number;
};

export type FundOverview = FundSummary & {
  fundHouse: string;
  category: string;
  schemeType: string;
  latest: NavPoint;
};

export type Fund = FundOverview & {
  // Oldest first, so charts and return calculations can read it left to right
  navHistory: NavPoint[];
};
