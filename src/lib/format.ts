const navFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-IN", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

export const formatNav = (nav: number): string => navFormatter.format(nav);

// 123456.7 -> "₹1,23,457"
export const formatRupees = (amount: number): string => rupeeFormatter.format(amount);

// 0.1234 -> "+12.3%"
export const formatPercent = (ratio: number): string => percentFormatter.format(ratio);

// "2026-11-20" -> "Nov 26" (chart axis labels)
export const formatShortDate = (isoDate: string): string =>
  shortDateFormatter.format(new Date(`${isoDate}T00:00:00Z`));

// "2026-11-20" -> "20 Nov 2026"
export const formatDate = (isoDate: string): string =>
  dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));

// "Parag Parikh Flexi Cap Fund - Direct Plan - Growth" -> "Parag Parikh Flexi Cap Fund"
export const getShortFundName = (schemeName: string): string =>
  schemeName.split(" - ")[0].trim();

// "Equity Scheme - Flexi Cap Fund" -> "Flexi Cap Fund"
export const getShortCategory = (category: string): string =>
  category.split(" - ").at(-1)?.trim() ?? category;
