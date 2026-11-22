import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("lists popular funds and links to their pages", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Explore Indian mutual funds, clearly." }),
    ).toBeVisible();

    await page.getByRole("link", { name: /Parag Parikh Flexi Cap Fund/ }).click();
    await expect(page).toHaveURL(/\/funds\/122639$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Parag Parikh Flexi Cap Fund" }),
    ).toBeVisible();
  });
});

test.describe("fund search", () => {
  test("finds funds by name and opens one", async ({ page }) => {
    await page.goto("/funds");
    await page.getByRole("searchbox", { name: "Search mutual funds" }).fill("parag");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/funds\?q=parag$/);
    await expect(page.getByText("2 funds found for “parag”")).toBeVisible();

    await page.getByRole("link", { name: /Regular Plan - Growth/ }).click();
    await expect(page).toHaveURL(/\/funds\/122640$/);
  });

  test("tells the user when nothing matches", async ({ page }) => {
    await page.goto("/funds?q=zzzz");
    await expect(page.getByText("No funds found for “zzzz”.")).toBeVisible();
  });
});

test.describe("fund page", () => {
  test("shows returns from the NAV history", async ({ page }) => {
    await page.goto("/funds/122639");
    const returns = page.getByRole("region", { name: "Returns" });
    // The mock fund grows 12% a year
    await expect(returns.getByText("+12.0%").first()).toBeVisible();
  });

  test("switches the chart range", async ({ page }) => {
    await page.goto("/funds/122639");
    const ranges = page.getByRole("group", { name: "Chart range" });
    const threeYears = ranges.getByRole("button", { name: "3Y" });

    await expect(ranges.getByRole("button", { name: "1Y" })).toHaveAttribute("aria-pressed", "true");
    await threeYears.click();
    await expect(threeYears).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/since 20 Nov 2023/)).toBeVisible();
  });

  test("backtests a SIP with the chosen amount and duration", async ({ page }) => {
    await page.goto("/funds/122639");
    const sip = page.getByRole("region", { name: "SIP backtest" });

    await sip.getByRole("spinbutton", { name: "Monthly amount (₹)" }).fill("5000");
    await sip.getByRole("group", { name: "SIP duration" }).getByRole("button", { name: "1Y" }).click();

    await expect(sip.getByText("₹60,000")).toBeVisible();
    await expect(sip.getByText("12 monthly instalments", { exact: false })).toBeVisible();
  });

  test("rejects an invalid SIP amount", async ({ page }) => {
    await page.goto("/funds/122639");
    const amount = page.getByRole("spinbutton", { name: "Monthly amount (₹)" });

    await amount.fill("50");
    await expect(amount).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Enter an amount between ₹100 and ₹10,00,000.")).toBeVisible();
  });

  test("explains when a fund is too new for returns or a SIP backtest", async ({ page }) => {
    await page.goto("/funds/900001");
    await expect(page.getByText("Not enough history").first()).toBeVisible();
    await expect(page.getByText(/less than a year of NAV history/)).toBeVisible();
  });

  test("shows a not-found page for an unknown scheme code", async ({ page }) => {
    await page.goto("/funds/999999");
    await expect(page.getByRole("heading", { name: "Fund not found" })).toBeVisible();
  });
});

test.describe("accessibility", () => {
  for (const path of ["/", "/funds?q=parag", "/funds/122639"]) {
    test(`${path} has no detectable accessibility violations`, async ({ page }) => {
      await page.goto(path);
      // Wait for streamed content to replace any loading skeleton
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("status")).toHaveCount(0);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
