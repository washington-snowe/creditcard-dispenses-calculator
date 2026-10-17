import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";

export async function verifyAccessibility(page, label) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    result.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => ({
        target: node.target,
        reason: node.failureSummary,
      })),
    })),
    [],
    `Acessibilidade: ${label}`,
  );
}
