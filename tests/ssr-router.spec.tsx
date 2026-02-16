import { describe, test, expect } from 'bun:test'
import { renderToString } from '../src/server/render'
import { jsx } from '../src/jsx-runtime'
import { Router, Routes, Route, A } from '../src/router'

describe('ssr router', () => {
  test('renderToString works with Routes/Route tree', () => {
    const App = () =>
      jsx(Router as any, {
        children: jsx(Routes as any, {
          children: [
            jsx(Route as any, {
              path: '/',
              children: () => jsx('div', { children: 'Home' }),
            }),
            jsx(Route as any, {
              path: '*',
              children: () => jsx('div', { children: '404' }),
            }),
          ],
        }),
      })

    const html = renderToString(App())
    expect(html).toContain('Home')
  })

  test('A renders as anchor in SSR', () => {
    const html = renderToString(jsx(A as any, { href: '/x', children: 'go' }))
    expect(html).toContain('<a')
    expect(html).toContain('go')
  })
})
