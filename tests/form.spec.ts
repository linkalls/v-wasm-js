import { describe, test, expect } from "bun:test";
import { Form } from "../src/form";

// Minimal unit tests for helpers that don't require DOM.
// (Most behavior is exercised via Playwright E2E.)

describe("form", () => {
  test("module loads", () => {
    expect(typeof Form).toBe("function");
  });
});
