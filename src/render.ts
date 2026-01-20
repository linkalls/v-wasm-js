/**
 * V-Signal Render
 * Mount components to DOM - Solid-style (create once, update bindings)
 */

import { cleanupNode, type VNode } from './jsx-runtime'

/**
 * Render a component to a container
 * DOM is created once. Reactive updates happen via fine-grained bindings in jsx-runtime.
 * @example
 * render(<App />, document.getElementById('root'))
 */
export function render(component: VNode | (() => VNode), container: Element | string | null): void {
  const root = typeof container === 'string' ? document.getElementById(container) : container

  if (!root) {
    throw new Error('Container element not found')
  }
  
  // Clear container once with cleanup to drop subscriptions
  // Optimization: Single DOM operation to clear, but we must cleanup subscribers first
  if (root.hasChildNodes()) {
    // We only need to cleanup children, not the root itself
    // Using Array.from to safely iterate while we might be modifying (though we aren't here)
    // Direct forEach on childNodes is fine since cleanupNode doesn't remove nodes
    root.childNodes.forEach(child => cleanupNode(child))
    root.textContent = ''
  }
  
  // Create DOM once - reactive bindings in jsx-runtime handle updates
  const result = typeof component === 'function' ? component() : component
  if (result instanceof Node) {
    root.appendChild(result)
  }
}

/**
 * Mount shorthand
 */
export const mount = render

