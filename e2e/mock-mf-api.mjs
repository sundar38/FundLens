// A tiny stand-in for https://api.mfapi.in used by the end-to-end tests.
// Same response shapes as the real API, but fixed, predictable data, so the
// tests don't break when the real API is down or NAVs change.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_MF_API_PORT ?? 4010);
const LATEST_DATE = "2026-11-20";

const FUNDS = {
  122639: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
  120716: "UTI Nifty 50 Index Fund - Direct Plan - Growth",
  118955: "HDFC Flexi Cap Fund - Direct Plan - Growth Option",
  125497: "SBI SMALL CAP FUND - Direct Plan - Growth",
  118825: "Mirae Asset Large Cap Fund - Direct Plan - Growth",
  120586: "ICICI Prudential Large Cap Fund - Direct Plan - Growth",
  120503: "Axis ELSS Tax Saver Fund - Direct Plan - Growth Option",
  118778: "Nippon India Small Cap Fund - Direct Plan - Growth Option",
  122640: "Parag Parikh Flexi Cap Fund - Regular Plan - Growth",
  // Launched 6 months ago: too young for returns or a SIP backtest
  900001: "New Launch Fund - Direct Plan - Growth",
};

const START_DATES = { 900001: "2026-05-20" };
const DAY_MS = 24 * 60 * 60 * 1000;

// Weekday NAVs growing 12% a year, newest first, dates as dd-mm-yyyy.
const makeNavData = (startIso) => {
  const start = Date.parse(`${startIso}T00:00:00Z`);
  const end = Date.parse(`${LATEST_DATE}T00:00:00Z`);
  const rows = [];
  for (let time = start; time <= end; time += DAY_MS) {
    const date = new Date(time);
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const nav = 10 * 1.12 ** ((time - start) / (365 * DAY_MS));
    const [year, month, day] = date.toISOString().slice(0, 10).split("-");
    rows.push({ date: `${day}-${month}-${year}`, nav: nav.toFixed(5) });
  }
  return rows.reverse();
};

const emptyFund = {
  meta: {
    fund_house: "",
    scheme_type: "",
    scheme_category: "",
    scheme_code: 0,
    scheme_name: "",
    isin_growth: null,
    isin_div_reinvestment: null,
  },
  data: [],
  status: "SUCCESS",
};

const sendJson = (response, body) => {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${PORT}`);

  if (url.pathname === "/health") return sendJson(response, { ok: true });

  if (url.pathname === "/mf/search") {
    const query = (url.searchParams.get("q") ?? "").toLowerCase();
    const results = Object.entries(FUNDS)
      .filter(([, name]) => name.toLowerCase().includes(query))
      .map(([code, name]) => ({ schemeCode: Number(code), schemeName: name }));
    return sendJson(response, results);
  }

  const match = url.pathname.match(/^\/mf\/(\d+)$/);
  if (match) {
    const code = match[1];
    const name = FUNDS[code];
    if (!name) return sendJson(response, emptyFund);
    return sendJson(response, {
      meta: {
        fund_house: `${name.split(" ")[0]} Mutual Fund`,
        scheme_type: "Open Ended Schemes",
        scheme_category: "Equity Scheme - Flexi Cap Fund",
        scheme_code: Number(code),
        scheme_name: name,
        isin_growth: null,
        isin_div_reinvestment: null,
      },
      data: makeNavData(START_DATES[code] ?? "2014-01-01"),
      status: "SUCCESS",
    });
  }

  response.writeHead(404).end();
});

server.listen(PORT, () => console.log(`Mock fund API on http://localhost:${PORT}`));
