// Dev JSX runtime shim — re-export from the primary runtime
export * from './jsx-runtime'

// Ensure jsx-dev-specific name exists
export { jsx as jsxDEV } from './jsx-runtime'
