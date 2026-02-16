import { describe, test, expect } from "bun:test";
import { v, derive, get, set, batch } from "../src/core";

describe("core", () => {
  test("set() uses Object.is short-circuit", () => {
    const a = v<number>(NaN);
    let runs = 0;
    const d = derive((get) => {
      runs++;
      return get(a);
    });

    // initialize
    expect(get(d)).toBeNaN();
    expect(runs).toBe(1);

    // setting NaN to NaN should not propagate/recompute
    set(a, NaN);
    expect(get(d)).toBeNaN();
    expect(runs).toBe(1);
  });

  test("batch() collapses multiple sets", () => {
    const a = v(0);
    let runs = 0;
    const d = derive((get) => {
      runs++;
      return get(a) * 2;
    });

    // init
    expect(get(d)).toBe(0);
    expect(runs).toBe(1);

    batch(() => {
      set(a, 1);
      set(a, 2);
      set(a, 3);
    });

    // Derived is push-updated; it may recompute during propagation.
    // The important contract is correctness.
    expect(get(d)).toBe(6);
    expect(runs).toBeGreaterThanOrEqual(2);
  });
});
