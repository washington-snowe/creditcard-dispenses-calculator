import { expect } from "playwright/test";

export async function verifyTypography(page) {
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => {
    const style = (selector) => {
      const element = document.querySelector(selector);
      const css = getComputedStyle(element);
      return {
        family: css.fontFamily,
        weight: css.fontWeight,
        numeric: css.fontVariantNumeric,
      };
    };
    return {
      body: style("body"),
      brand: style(".brand .brand-name"),
      heading: style("main h1"),
      balance: style(".stat-card > strong"),
      manrope: document.fonts.check("600 14px Manrope"),
      manropeBold: document.fonts.check("700 14px Manrope"),
      inter: document.fonts.check("400 14px Inter"),
    };
  });
  expect(fonts.body.family).toMatch(/^Inter/);
  expect(fonts.balance.family).toMatch(/^Inter/);
  expect(fonts.balance.numeric).toContain("tabular-nums");
  expect(fonts.brand.family).toMatch(/^Manrope/);
  expect(fonts.brand.weight).toBe("700");
  expect(fonts.heading.family).toMatch(/^Manrope/);
  expect(fonts.heading.weight).toBe("600");
  expect(fonts.manrope && fonts.manropeBold && fonts.inter).toBeTruthy();
  const logo = page.locator(".sidebar .brand-full");
  await expect
    .poll(() => logo.evaluate((image) => image.naturalWidth))
    .toBe(1774);
  const logoDetails = await logo.evaluate((image) => ({
    height: image.naturalHeight,
    filter: getComputedStyle(image).filter,
    ratio:
      image.getBoundingClientRect().height > 0
        ? image.getBoundingClientRect().width /
          image.getBoundingClientRect().height
        : null,
  }));
  expect(logoDetails.height).toBe(887);
  expect(logoDetails.filter).toBe("none");
  if (logoDetails.ratio !== null) expect(logoDetails.ratio).toBeCloseTo(2, 4);
  await verifyBrandLayout(page);
  await expect(page).toHaveTitle(/ContaClara/);
  const widths = await page.evaluate(() => {
    const row = document.createElement("div");
    row.style.cssText =
      "position:fixed;visibility:hidden;font:600 20px var(--font-interface);font-variant-numeric:tabular-nums";
    for (const value of ["111111,11", "888888,88"]) {
      const span = document.createElement("span");
      span.style.display = "inline-block";
      span.textContent = value;
      row.append(span);
    }
    document.body.append(row);
    const sizes = [...row.children].map(
      (el) => el.getBoundingClientRect().width,
    );
    row.remove();
    return sizes;
  });
  expect(Math.abs(widths[0] - widths[1])).toBeLessThan(0.1);
}

export async function verifyBrandLayout(page) {
  const symbol = page.locator(".sidebar .brand-symbol");
  await expect
    .poll(() => symbol.evaluate((image) => image.naturalWidth))
    .toBe(1254);
  const details = await symbol.evaluate((image) => ({
    height: image.naturalHeight,
    filter: getComputedStyle(image).filter,
    width: image.getBoundingClientRect().width,
    renderedHeight: image.getBoundingClientRect().height,
  }));
  expect(details.height).toBe(1254);
  expect(details.filter).toBe("none");
  const compact = await page.evaluate(() => window.innerWidth <= 1020);
  if (compact) {
    await expect(symbol).toBeVisible();
    await expect(page.locator(".sidebar .brand-full")).toBeHidden();
    expect(details.width / details.renderedHeight).toBeCloseTo(1, 4);
  } else {
    await expect(symbol).toBeHidden();
    await expect(page.locator(".sidebar .brand-full")).toBeVisible();
  }
}

export async function verifyPageLayout(page, context) {
  const layout = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const overflow = [...document.querySelectorAll("main *")]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        if (!box.width || !box.height || box.right <= viewport + 1)
          return false;
        for (let parent = el; parent; parent = parent.parentElement) {
          if (
            ["auto", "scroll", "hidden", "clip"].includes(
              getComputedStyle(parent).overflowX,
            )
          )
            return false;
        }
        return true;
      })
      .slice(0, 6)
      .map(
        (el) =>
          `${el.tagName}.${el.className}: ${el.getBoundingClientRect().right}`,
      );
    return {
      width: document.documentElement.scrollWidth,
      viewport,
      overflow,
      clippedAmounts: [
        ...document.querySelectorAll(
          ".stat-card > strong, .mini-card-bottom strong, .managed-card-amount > strong, .plastic-brand strong, .card-digits, .plastic-bottom strong, .purchase-name strong",
        ),
      ]
        .filter((el) => {
          if (!el.getBoundingClientRect().width) return false;
          const range = document.createRange();
          range.selectNodeContents(el);
          const text = range.getBoundingClientRect();
          for (let parent = el; parent; parent = parent.parentElement) {
            const overflow = getComputedStyle(parent).overflowX;
            if (["auto", "scroll"].includes(overflow)) return false;
            if (["hidden", "clip"].includes(overflow)) {
              const bounds = parent.getBoundingClientRect();
              if (text.right > bounds.right + 2 || text.left < bounds.left - 2)
                return true;
            }
          }
          return false;
        })
        .map((el) => el.textContent),
      badHeadings: [...document.querySelectorAll("main h1, main h2, main h3")]
        .filter((el) => {
          const css = getComputedStyle(el);
          return (
            !css.fontFamily.startsWith("Manrope") || css.fontWeight !== "600"
          );
        })
        .map((el) => el.textContent),
    };
  });
  expect(
    layout.width,
    `${context}: ${layout.overflow.join("; ")}`,
  ).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.overflow, context).toEqual([]);
  expect(layout.badHeadings, context).toEqual([]);
  expect(layout.clippedAmounts, `${context} / valores cortados`).toEqual([]);
}
