# Contributing

Thanks for contributing to Vitrio.

## Local Setup

```bash
npm install
npm run build
```

Optional (for WASM rebuild contributors only):
- V compiler
- binaryen (`wasm-opt`)

## Development Commands

```bash
npm run build
npm run test:wasm
```

## Pull Request Checklist

- Keep changes focused and atomic
- Update docs for user-facing API changes
- Ensure build/check commands pass locally
- Add/update tests when behavior changes

## Commit Style

Use clear, imperative commit messages, e.g.:
- `feat: add batch API for grouped updates`
- `docs: align capabilities with implemented features`
