/**
 * V-Signal Render
 * Mount components to DOM - Solid-style (create once, update bindings)
 */

import { type VNode } from './jsx-runtime'

/**
 * Render a component to a container
 * DOM is created once. Reactive updates happen via fine-grained bindings in jsx-runtime.
 * @example
 * render(<App />, document.getElementById('root'))
 */
export function render(component: VNode | (() => VNode), container: Element | null): void {
  if (!container) {
    throw new Error('Container element not found')
  }
  
  // Clear container once
  container.innerHTML = ''
  
  // Create DOM once - reactive bindings in jsx-runtime handle updates
  const result = typeof component === 'function' ? component() : component
  if (result instanceof Node) {
    container.appendChild(result)
  }
}

/**
 * Mount shorthand
 */
export const mount = render

