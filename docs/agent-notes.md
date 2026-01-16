# Agent Notes

- Updated `h()` in `src/jsx-runtime.ts` to avoid `children.flat()` by manually flattening one level into a `flat` array before calling `createElement`.
