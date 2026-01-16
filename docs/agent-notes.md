# Agent Notes

- Updated `h()` in `src/jsx-runtime.ts` to avoid `children.flat()` by manually flattening one level into a `flat` array before calling `createElement`.
- Ran benchmark builds for Vitrio, Solid, and React and refreshed `results.md` plus benchmark summary numbers in `docs/benchmarks.md`.
- Clarified benchmark write-up to reflect which metrics are leading vs still behind.
- Optimized `<For>` update paths and adjusted benchmark harness/load timing, then reran benchmarks.
