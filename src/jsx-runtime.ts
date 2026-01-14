/**
 * V-Signal JSX Runtime
 * Standard JSX runtime exports for react-jsx transform
 */

import { withRenderContext } from './core'

export type VNode = Element | Text | DocumentFragment

// Child types that can appear in JSX
export type Child = VNode | string | number | boolean | null | undefined | (() => string | number)
export type Children = Child | Child[]

export type Props = Record<string, any> & {
  children?: Children
}

type Component = (props: Props) => VNode

/**
 * JSX Factory function (jsx/jsxs for react-jsx transform)
 */
export function jsx(
  type: string | Component,
  props: Props | null,
  _key?: string
): VNode {
  return createElement(type, props)
}

export const jsxs = jsx
export const jsxDEV = jsx

/**
 * JSX Factory function (h for classic mode)
 */
export function h(
  type: string | Component,
  props: Props | null,
  ...children: any[]
): VNode {
  return createElement(type, { ...props, children: children.flat() })
}

function createElement(
  type: string | Component,
  props: Props | null
): VNode {
  // Extract children from props
  const allChildren = props?.children ? (Array.isArray(props.children) ? props.children : [props.children]) : []
  
  // Handle function components
  if (typeof type === 'function') {
    return type({ ...props, children: allChildren })
  }
  
  // Create element
  const el = document.createElement(type)
  
  // Apply props
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'children') continue
      
      if (key.startsWith('on')) {
        // Event handlers: onClick -> click
        const event = key.slice(2).toLowerCase()
        el.addEventListener(event, value)
      } else if (key === 'class' || key === 'className') {
        el.className = value
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value)
      } else if (key === 'ref') {
        value(el)
      } else {
        el.setAttribute(key, String(value))
      }
    }
  }
  
  // Append children
  appendChildren(el, allChildren)
  
  return el
}

function appendChildren(parent: Element, children: any[]): void {
  for (const child of children) {
    if (child == null || child === false) continue
    
    if (typeof child === 'function') {
      // Reactive text node - subscribes to atoms used in the function
      const textNode = document.createTextNode('')
      
      // Create an update function that will be called when atoms change
      const update = () => {
        withRenderContext(() => {
          const result = child()
          textNode.textContent = String(result ?? '')
        })
      }
      
      // Initial render with subscription tracking
      update()
      
      parent.appendChild(textNode)
    } else if (child instanceof Node) {
      parent.appendChild(child)
    } else if (Array.isArray(child)) {
      appendChildren(parent, child)
    } else {
      parent.appendChild(document.createTextNode(String(child)))
    }
  }
}

/**
 * Fragment support
 */
export function Fragment(props: { children?: any[] }): DocumentFragment {
  const frag = document.createDocumentFragment()
  if (props.children) {
    appendChildren(frag as any, Array.isArray(props.children) ? props.children : [props.children])
  }
  return frag
}

// JSX namespace for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
    interface Element extends globalThis.Element {}
  }
}

export namespace JSX {
  export interface IntrinsicElements {
    [elemName: string]: any
  }
  export interface Element extends globalThis.Element {}
}
