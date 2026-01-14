/**
 * V-Signal Render
 * Mount components to DOM
 */

import { type VNode } from './jsx-runtime'
import { withRenderContext } from './core'

/**
 * Render a component to a container
 * @example
 * render(<App />, document.getElementById('root'))
 */
export function render(component: VNode | (() => VNode), container: Element | null): void {
  if (!container) {
    throw new Error('Container element not found')
  }
  
  // Render function: clears container and appends result
  const doRender = () => {
    const result = typeof component === 'function' ? component() : component

    // Simple structural diff: if the result is the same node (or null/undefined), do nothing (it updated itself).
    // If it's a new node but the container has it as the only child, also assume it updated itself (common in this framework).
    // Only clear and append if we strictly need to replace the root.
    if (result instanceof Node) {
      if (container.firstChild === result && container.childNodes.length === 1) {
        // No-op: The node updated itself in place
        return
      }
      container.innerHTML = ''
      container.appendChild(result)
    }
  }

  if (typeof component === 'function') {
    // Reactive component: register an `update` that always runs inside the render context.
    // We register `update` as the subscriber so subsequent atom changes re-run with context.
    const update = () => withRenderContext(doRender)
    // Run the first render (this will set up subscriptions)
    update()
  } else if (component instanceof Node) {
    container.innerHTML = ''
    container.appendChild(component)
  }
}

/**
 * Mount shorthand
 */
export const mount = render
