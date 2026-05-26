import { describe, expect, it } from "vitest";

// Smoke test: confirms the vitest infra is wired up.
// Real suites come later, when a course project needs them.
describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
