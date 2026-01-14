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
    container.innerHTML = ''
    const result = typeof component === 'function' ? component() : component
    if (result instanceof Node) {
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
