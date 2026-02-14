# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- `batch(fn)` API to group multiple state updates and flush subscribers once.
- `startTransition(fn)` API to defer non-urgent updates using idle/timer scheduling.
- `createResource` options for resilience: `initialValue`, `retries`, `retryDelayMs`, `onError`.
- Security, support, and contribution policy documents for production/commercial adoption.
- CI workflow for install/build/wasm checks.

### Changed
- README and API docs updated with `batch` examples.
- Capabilities documentation aligned with implemented Suspense/ErrorBoundary/SSR string rendering support.
