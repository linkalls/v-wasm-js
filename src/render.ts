/**
 * V-Signal Render
 * Mount components to DOM - Solid-style (create once, update bindings)
 */

import { cleanupNode, resolve, type VNode } from './jsx-runtime'
import { createRoot } from './core'

/**
 * Render a component to a container
 * DOM is created once. Reactive updates happen via fine-grained bindings in jsx-runtime.
 * @example
 * render(<App />, document.getElementById('root'))
 */
export function render(component: VNode | (() => VNode), container: Element | null): (() => void) {
  if (!container) {
    throw new Error('Container element not found')
  }
  
  // Dispose previous root if exists
  const oldDispose = (container as any)._dispose;
  if (typeof oldDispose === 'function') {
    oldDispose();
    (container as any)._dispose = undefined;
  }

  // Clear container once with cleanup to drop subscriptions
  while (container.firstChild) {
    cleanupNode(container.firstChild)
    container.removeChild(container.firstChild)
  }
  
  // Create DOM once - reactive bindings in jsx-runtime handle updates
  // Run in root scope to manage lifecycle of effects
  return createRoot((dispose) => {
    (container as any)._dispose = dispose;

    // If component is a function (e.g. () => <App /> or App), execute it first
    // to get the VNode/Descriptor.
    let root = component;
    if (typeof root === 'function') {
      root = (root as () => VNode)();
    }

    const result = resolve(root);
    if (result) {
      container.appendChild(result)
    }

    return dispose;
  });
}

/**
 * Mount shorthand
 */
export const mount = render
