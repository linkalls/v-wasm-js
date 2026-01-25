/**
 * V-Signal JSX Runtime
 * Standard JSX runtime exports for react-jsx transform
 */

import { disposeEffect, withRenderContext } from "./core";

export type VNode = Element | Text | DocumentFragment;

// Child types that can appear in JSX
export type Child =
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | (() => string | number);
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

  // Handle function components
  if (typeof type === "function") {
    return type({ ...props, children: allChildren });
  }

  // Create element
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

function appendChildren(parent: Element, children: any[]): void {
  for (const child of children) {
    if (child == null || child === false) continue;

    if (typeof child === "function") {
      // Reactive text node - subscribes to atoms used in the function
      const textNode = document.createTextNode("");

      // Create an update function that will be called when atoms change
      const update = () => {
        const result = child();
        textNode.textContent = String(result ?? "");
      };

      // Initial render with subscription tracking
      withRenderContext(update);
      registerCleanup(textNode, () => disposeEffect(update));

      parent.appendChild(textNode);
    } else if (child instanceof Node) {
      parent.appendChild(child);
    } else if (Array.isArray(child)) {
      appendChildren(parent, child);
    } else {
      parent.appendChild(document.createTextNode(String(child)));
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
