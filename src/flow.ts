/**
 * V-Signal Control Flow Components
 * Solid-style Show/For/Switch with marker-based DOM updates
 */

import { type VNode } from './jsx-runtime'
import { withRenderContext, untrack } from './core'

type MaybeReactive<T> = T | (() => T)

function resolve<T>(value: MaybeReactive<T>): T {
  return typeof value === 'function' ? (value as () => T)() : value
}

/**
 * Conditional rendering with marker nodes
 * @example
 * <Show when={isVisible}>
 *   <Content />
 * </Show>
 */
export function Show(props: {
  when: MaybeReactive<boolean>
  children: VNode | (() => VNode)
  fallback?: VNode | (() => VNode)
}): VNode {
  const marker = document.createComment('show')
  let currentNode: Node | null = null
  let showingFallback = false
  
  // Handle children array from JSX runtime
  const getChildren = () => {
    const c = props.children
    if (Array.isArray(c) && c.length === 1 && typeof c[0] === 'function') return c[0]
    return c
  }

  const update = () => {
    const condition = resolve(props.when)
    const parent = marker.parentNode
    
    if (condition) {
      // Show main content
      if (showingFallback && currentNode) {
        currentNode.parentNode?.removeChild(currentNode)
        currentNode = null
      }
      
      if (!currentNode || showingFallback) {
        const children = getChildren()
        const child = typeof children === 'function'
          ? (children as () => VNode)()
          : children
        if (child instanceof Node) {
          currentNode = child
          parent?.insertBefore(child, marker.nextSibling)
        }
        showingFallback = false
      }
    } else {
      // Show fallback or nothing
      if (currentNode && !showingFallback) {
        currentNode.parentNode?.removeChild(currentNode)
        currentNode = null
      }
      
      if (props.fallback && !showingFallback) {
        const fallback = typeof props.fallback === 'function'
          ? props.fallback()
          : props.fallback
        if (fallback instanceof Node) {
          currentNode = fallback.cloneNode(true)
          parent?.insertBefore(currentNode, marker.nextSibling)
          showingFallback = true
        }
      } else if (!props.fallback) {
        showingFallback = false
      }
    }
  }
  
  // Create fragment container
  const frag = document.createDocumentFragment()
  frag.appendChild(marker)
  
  // Initial render with subscription
  withRenderContext(update)
  
  return frag as unknown as VNode
}

/**
 * List rendering with keyed reconciliation
 * @example
 * <For each={items}>
 *   {(item, index) => <li>{item.name}</li>}
 * </For>
 */
export function For<T>(props: {
  each: MaybeReactive<T[]>
  children: (item: T, index: () => number) => VNode
  key?: (item: T, index: number) => string | number
}): VNode {
  const marker = document.createComment('for')
  const nodeMap = new Map<string | number, { node: Node; item: T; indexFn: () => number }>()
  let currentKeys: (string | number)[] = []
  
  // Default key function uses index
  const getKey = props.key || ((_item: T, i: number) => i)

  // Handle children array from JSX runtime
  const renderItem = (item: T, indexFn: () => number) => {
    const c = props.children
    const fn = (Array.isArray(c) && c.length === 1 && typeof c[0] === 'function') ? c[0] : c
    if (typeof fn === 'function') {
        return fn(item, indexFn)
    }
    return document.createTextNode('') // Fallback
  }
  
  const update = () => {
    const items = resolve(props.each)
    const parent = marker.parentNode
    if (!parent) return
    
    const newKeys = items.map((item, i) => getKey(item, i))
    const newKeySet = new Set(newKeys)
    
    // Remove nodes that no longer exist
    for (const oldKey of currentKeys) {
      if (!newKeySet.has(oldKey)) {
        const entry = nodeMap.get(oldKey)
        if (entry) {
          entry.node.parentNode?.removeChild(entry.node)
          nodeMap.delete(oldKey)
        }
      }
    }
    
    // Insert/reorder nodes (iterate in order)
    let prevNode: Node = marker
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const key = newKeys[i]
      
      let entry = nodeMap.get(key)
      if (!entry) {
        // Create new node
        let currentIndex = i
        const indexFn = () => currentIndex
        const node = untrack(() => renderItem(item, indexFn))
        if (node instanceof Node) {
          entry = { node, item, indexFn }
          nodeMap.set(key, entry)
          // Insert after prevNode
          parent.insertBefore(node, prevNode.nextSibling)
        }
      } else {
        // Reuse existing node, update index and move if needed
        const closureIndex = i
        // @ts-ignore - update the index closure
        entry.indexFn = () => closureIndex
        
        if (prevNode.nextSibling !== entry.node) {
          parent.insertBefore(entry.node, prevNode.nextSibling)
        }
      }
      
      if (entry) {
        prevNode = entry.node
      }
    }
    
    currentKeys = newKeys
  }
  
  // Create fragment container  
  const frag = document.createDocumentFragment()
  frag.appendChild(marker)
  
  // Initial render with subscription
  withRenderContext(update)
  
  return frag as unknown as VNode
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
