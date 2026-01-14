/**
 * V-Signal Control Flow Components
 * Declarative Show/For/Switch for TSX
 */

import { h, type VNode, type Props } from './jsx-runtime'

type MaybeReactive<T> = T | (() => T)

function resolve<T>(value: MaybeReactive<T>): T {
  return typeof value === 'function' ? (value as () => T)() : value
}

/**
 * Conditional rendering
 * @example
 * <Show when={isVisible}>
 *   <Content />
 * </Show>
 */
export function Show(props: {
  when: MaybeReactive<boolean>
  children: VNode | (() => VNode)
  fallback?: VNode
}): VNode {
  const container = document.createElement('span')
  container.style.display = 'contents'
  
  const render = () => {
    container.innerHTML = ''
    const condition = resolve(props.when)
    
    if (condition) {
      const child = typeof props.children === 'function' 
        ? props.children() 
        : props.children
      if (child instanceof Node) {
        container.appendChild(child)
      }
    } else if (props.fallback) {
      if (props.fallback instanceof Node) {
        container.appendChild(props.fallback.cloneNode(true))
      }
    }
  }
  
  render()
  return container
}

/**
 * List rendering
 * @example
 * <For each={items}>
 *   {(item, index) => <li>{item.name}</li>}
 * </For>
 */
export function For<T>(props: {
  each: MaybeReactive<T[]>
  children: (item: T, index: number) => VNode
}): VNode {
  const container = document.createElement('span')
  container.style.display = 'contents'
  
  const render = () => {
    container.innerHTML = ''
    const items = resolve(props.each)
    
    items.forEach((item, index) => {
      const child = props.children(item, index)
      if (child instanceof Node) {
        container.appendChild(child)
      }
    })
  }
  
  render()
  return container
}

/**
 * Switch/Match for pattern matching
 * @example
 * <Switch fallback={<Default />}>
 *   <Match when={status === 'loading'}><Spinner /></Match>
 *   <Match when={status === 'error'}><Error /></Match>
 * </Switch>
 */
export function Switch(props: {
  fallback?: VNode
  children: VNode[]
}): VNode {
  const container = document.createElement('span')
  container.style.display = 'contents'
  
  // Find first matching child
  for (const child of props.children) {
    if (child instanceof Element && child.hasAttribute('data-match-when')) {
      const when = child.getAttribute('data-match-when') === 'true'
      if (when) {
        container.appendChild(child)
        return container
      }
    }
  }
  
  // Fallback
  if (props.fallback instanceof Node) {
    container.appendChild(props.fallback)
  }
  
  return container
}

export function Match(props: {
  when: MaybeReactive<boolean>
  children: VNode
}): VNode {
  const container = document.createElement('span')
  container.style.display = 'contents'
  container.setAttribute('data-match-when', String(resolve(props.when)))
  
  if (props.children instanceof Node) {
    container.appendChild(props.children)
  }
  
  return container
}
