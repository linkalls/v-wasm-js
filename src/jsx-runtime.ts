/**
 * V-Signal JSX Runtime
 * Standard JSX runtime exports for react-jsx transform
 */

import { disposeEffect, withRenderContext } from "./core";

export type ComponentDescriptor = {
  _brand: "component";
  type: Component;
  props: Props;
};

export type VNode = Element | Text | DocumentFragment | ComponentDescriptor;

// Child types that can appear in JSX
export type Child =
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | (() => string | number | VNode);
export type Children = Child | Child[];

export type Props = Record<string, any> & {
  children?: Children;
};

type Component = (props: Props) => VNode;

const CLEANUP_SYMBOL = Symbol("v-cleanup");

type CleanupFn = () => void;

export function registerCleanup(node: Node, cleanup: CleanupFn): void {
  const existing = (node as any)[CLEANUP_SYMBOL] as CleanupFn[] | undefined;
  if (existing) {
    existing.push(cleanup);
  } else {
    (node as any)[CLEANUP_SYMBOL] = [cleanup];
  }
}

export function cleanupNode(node: Node): void {
  // Stack-based iteration to avoid recursion overhead
  const stack: Node[] = [node];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const cleanups = (current as any)[CLEANUP_SYMBOL] as
      | CleanupFn[]
      | undefined;
    if (cleanups) {
      // Direct loop for better performance
      const len = cleanups.length;
      for (let i = 0; i < len; i++) cleanups[i]();
      (current as any)[CLEANUP_SYMBOL] = undefined;
    }
    if (current instanceof Element || current instanceof DocumentFragment) {
      const children = current.childNodes;
      // Push children directly to stack
      const childLen = children.length;
      for (let i = 0; i < childLen; i++) stack.push(children[i]);
    }
  }
}

/**
 * JSX Factory function (jsx/jsxs for react-jsx transform)
 */
export function jsx(
  type: string | Component,
  props: Props | null,
  _key?: string,
): VNode {
  return createElement(type, props);
}

export const jsxs = jsx;
export const jsxDEV = jsx;

/**
 * JSX Factory function (h for classic mode)
 */
export function h(
  type: string | Component,
  props: Props | null,
  ...children: any[]
): VNode {
  const flat: any[] = [];
  for (const child of children) {
    if (Array.isArray(child)) {
      for (const nested of child) {
        flat.push(nested);
      }
    } else {
      flat.push(child);
    }
  }
  return createElement(type, { ...props, children: flat });
}

function createElement(type: string | Component, props: Props | null): VNode {
  // Extract children from props
  const allChildren = props?.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [];

  // Handle function components: Return Descriptor (Lazy Evaluation)
  if (typeof type === "function") {
    return {
      _brand: "component",
      type,
      props: { ...props, children: allChildren }
    };
  }

  // Create element (Immediate Evaluation for Host Elements)
  const el = document.createElement(type);

  // Apply props with reactive binding support
  if (props) {
    // Optimization: Use Object.keys for faster iteration
    const keys = Object.keys(props);
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
      if (key === "children") continue;

      const value = props[key];

      if (key.startsWith("on")) {
        // Event handlers: onClick -> click
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, value);
      } else if (key === "ref") {
        value(el);
      } else if (typeof value === "function") {
        // Reactive binding - subscribe to changes
        const updateProp = () => {
          const result = value();
          if (key === "class" || key === "className") {
            el.className = String(result ?? "");
          } else if (key === "style") {
            if (typeof result === "object" && result !== null) {
              // Reset and apply new styles
              el.removeAttribute("style");
              Object.assign(el.style, result);
            } else {
              el.setAttribute("style", String(result ?? ""));
            }
          } else {
            // Generic attribute
            if (result == null || result === false) {
              el.removeAttribute(key);
            } else if (result === true) {
              el.setAttribute(key, "");
            } else {
              el.setAttribute(key, String(result));
            }
          }
        };
        withRenderContext(updateProp);
        registerCleanup(el, () => disposeEffect(updateProp));
      } else if (key === "class" || key === "className") {
        el.className = value;
      } else if (key === "style" && typeof value === "object") {
        Object.assign(el.style, value);
      } else if (key === "style") {
        el.style.cssText = String(value ?? "");
      } else if (key === "id") {
        el.id = String(value);
      } else if (key === "value") {
        (el as HTMLInputElement).value = String(value ?? "");
      } else if (key === "type") {
        (el as HTMLInputElement).type = String(value);
      } else if (key === "placeholder") {
        (el as HTMLInputElement).placeholder = String(value);
      } else if (key === "checked") {
        (el as HTMLInputElement).checked = Boolean(value);
      } else if (key === "disabled") {
        (el as HTMLInputElement).disabled = Boolean(value);
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }

  // Append children
  appendChildren(el, allChildren);

  return el;
}

export function resolve(child: any): Node | null {
  if (child == null || child === false || child === true) return null;

  if (child instanceof Node) return child;

  if (Array.isArray(child)) {
    const frag = document.createDocumentFragment();
    for (const c of child) {
      const resolved = resolve(c);
      if (resolved) frag.appendChild(resolved);
    }
    return frag;
  }

  // Component Descriptor -> Execute
  if (typeof child === 'object' && child._brand === 'component') {
    const res = child.type(child.props);
    return resolve(res);
  }

  // Reactive Function (Text Binding or Dynamic Component)
  if (typeof child === 'function') {
    const textNode = document.createTextNode("");
    const update = () => {
      const result = child();
      // If result is non-primitive (Node/Descriptor), we fall back to string
      // Users should use Show/Match for swapping Nodes
      textNode.textContent = String(result ?? "");
    };
    withRenderContext(update);
    registerCleanup(textNode, () => disposeEffect(update));
    return textNode;
  }

  // String/Number
  return document.createTextNode(String(child));
}

function appendChildren(parent: Element, children: any[]): void {
  for (const child of children) {
    const resolved = resolve(child);
    if (resolved) {
      parent.appendChild(resolved);
    }
  }
}

/**
 * Fragment support
 */
export function Fragment(props: { children?: any[] }): DocumentFragment {
  const frag = document.createDocumentFragment();
  if (props.children) {
    appendChildren(
      frag as any,
      Array.isArray(props.children) ? props.children : [props.children],
    );
  }
  return frag;
}

// JSX namespace for TypeScript - Vitrio uses VNode which includes DocumentFragment
declare global {
  namespace JSX {
    // Allow any HTML element
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    // VNode includes Element, Text, and DocumentFragment
    type Element = import("./jsx-runtime").VNode;
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

export namespace JSX {
  export interface IntrinsicElements {
    [elemName: string]: any;
  }
  export type Element = VNode;
  export interface ElementChildrenAttribute {
    children: {};
  }
}
