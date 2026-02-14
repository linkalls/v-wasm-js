/**
 * V-Signal Control Flow Components
 * Solid-style Show/For/Switch with marker-based DOM updates
 */

import { cleanupNode, registerCleanup, resolve, type VNode } from "./jsx-runtime";
import { disposeEffect, withRenderContext } from "./core";

type MaybeReactive<T> = T | (() => T);

function resolveValue<T>(value: MaybeReactive<T>): T {
  return typeof value === "function" ? (value as () => T)() : value;
}

/**
 * Conditional rendering with marker nodes
 * @example
 * <Show when={isVisible}>
 *   <Content />
 * </Show>
 */
export function Show(props: {
  when: MaybeReactive<boolean>;
  children: VNode | (() => VNode) | (VNode | (() => VNode))[];
  fallback?: VNode | (() => VNode) | (VNode | (() => VNode))[];
}): VNode {
  const marker = document.createComment("show");
  // Track list of nodes (support Fragments)
  let currentNodes: Node[] = [];
  let showingFallback = false;

  // Extract first child (JSX passes as array)
  const getChild = () => {
    const c = Array.isArray(props.children)
      ? props.children[0]
      : props.children;
    return typeof c === 'function' ? resolve(c()) : resolve(c);
  };
  const getFallback = () => {
    if (!props.fallback) return null;
    const f = Array.isArray(props.fallback)
      ? props.fallback[0]
      : props.fallback;
    return typeof f === 'function' ? resolve(f()) : resolve(f);
  };

  const update = () => {
    const condition = resolveValue(props.when);
    const parent = marker.parentNode;
    if (!parent) return;

    if (condition) {
      // Show main content
      if (showingFallback && currentNodes.length > 0) {
        for (const n of currentNodes) {
           cleanupNode(n);
           n.parentNode?.removeChild(n);
        }
        currentNodes = [];
      }

      if (currentNodes.length === 0 || showingFallback) {
        const child = getChild();
        if (child) {
          if (child instanceof DocumentFragment) {
            currentNodes = Array.from(child.childNodes);
            parent.insertBefore(child, marker.nextSibling);
          } else if (child instanceof Node) {
            currentNodes = [child];
            parent.insertBefore(child, marker.nextSibling);
          }
        }
        showingFallback = false;
      }
    } else {
      // Show fallback or nothing
      if (currentNodes.length > 0 && !showingFallback) {
        for (const n of currentNodes) {
           cleanupNode(n);
           n.parentNode?.removeChild(n);
        }
        currentNodes = [];
      }

      if (props.fallback && !showingFallback) {
        const fallback = getFallback();
        if (fallback) {
          if (fallback instanceof DocumentFragment) {
             currentNodes = Array.from(fallback.childNodes);
             parent.insertBefore(fallback, marker.nextSibling);
          } else if (fallback instanceof Node) {
             currentNodes = [fallback];
             parent.insertBefore(fallback, marker.nextSibling);
          }
          showingFallback = true;
        }
      } else if (!props.fallback) {
        showingFallback = false;
      }
    }
  };

  // Create fragment container
  const frag = document.createDocumentFragment();
  frag.appendChild(marker);

  registerCleanup(marker, () => disposeEffect(update));

  // Initial render with subscription
  withRenderContext(update);

  return frag as unknown as VNode;
}

/**
 * List rendering with keyed reconciliation
 * @example
 * <For each={items}>
 *   {(item, index) => <li>{item.name}</li>}
 * </For>
 */
export function For<T>(props: {
  each: MaybeReactive<T[]>;
  children:
    | ((item: T, index: () => number) => VNode)
    | ((item: T, index: () => number) => VNode)[];
  key?: (item: T, index: number) => string | number;
}): VNode {
  const marker = document.createComment("for");
  type Key = string | number;
  type ForEntry = {
    node: Node;
    item: T;
    index: number;
    indexFn: () => number;
    indexRef: { value: number };
  };

  const nodeMap = new Map<Key, ForEntry>();
  let currentKeys: Key[] = [];

  // Default key function uses index
  const getKey = props.key || ((_item: T, i: number) => i);

  // Extract render function from children (JSX passes as array)
  const renderFn = Array.isArray(props.children)
    ? props.children[0]
    : props.children;

  // Create fragment container first
  const frag = document.createDocumentFragment();
  frag.appendChild(marker);

  const update = () => {
    const items = resolveValue(props.each);
    const targetParent: Node = marker.parentNode || frag;
    const len = items.length;
    const prevLen = currentKeys.length;

    // Fast path: empty to empty (no-op)
    if (len === 0 && prevLen === 0) return;

    // Pre-allocate array with exact size
    const newKeys: Key[] = new Array(len);
    // Inline key generation for speed
    let i = 0;
    while (i < len) {
      newKeys[i] = getKey(items[i], i);
      i++;
    }

    // Fast path: pure append when prefix is unchanged
    if (prevLen > 0 && len >= prevLen) {
      let isPrefix = true;
      for (let i = 0; i < prevLen; i++) {
        if (currentKeys[i] !== newKeys[i]) {
          isPrefix = false;
          break;
        }
      }

      if (isPrefix) {
        let prevNode = prevLen
          ? nodeMap.get(currentKeys[prevLen - 1])?.node || marker
          : marker;

        for (let i = prevLen; i < len; i++) {
          const key = newKeys[i];
          const indexRef = { value: i };
          const indexFn = () => indexRef.value;
          const descriptor = renderFn(items[i], indexFn);
          const node = resolve(descriptor);

          if (node instanceof Node) {
            const entry: ForEntry = {
              node,
              item: items[i],
              index: i,
              indexFn,
              indexRef,
            };
            nodeMap.set(key, entry);
            targetParent.insertBefore(node, prevNode.nextSibling);
            prevNode = node;
          }
        }

        currentKeys = newKeys;
        return;
      }
    }

    // Fast path: shrink only (no reorders), keep stable order while removing missing nodes
    if (prevLen > 0 && len <= prevLen) {
      let nextIdx = 0;
      for (let i = 0; i < prevLen && nextIdx < len; i++) {
        if (currentKeys[i] === newKeys[nextIdx]) {
          nextIdx++;
        }
      }

      if (nextIdx === len) {
        const newKeySet = new Set(newKeys);
        for (const oldKey of currentKeys) {
          if (!newKeySet.has(oldKey)) {
            const entry = nodeMap.get(oldKey);
            if (entry) {
              cleanupNode(entry.node);
              entry.node.parentNode?.removeChild(entry.node);
              nodeMap.delete(oldKey);
            }
          }
        }

        let prevNode: Node = marker;
        for (let i = 0; i < len; i++) {
          const key = newKeys[i];
          const entry = nodeMap.get(key);
          if (entry) {
            entry.index = i;
            entry.indexRef.value = i;
            if (prevNode.nextSibling !== entry.node) {
              targetParent.insertBefore(entry.node, prevNode.nextSibling);
            }
            prevNode = entry.node;
          }
        }

        currentKeys = newKeys;
        return;
      }
    }

    const newKeySet = new Set(newKeys);

    // Remove nodes that no longer exist
    for (const oldKey of currentKeys) {
      if (!newKeySet.has(oldKey)) {
        const entry = nodeMap.get(oldKey);
        if (entry) {
          cleanupNode(entry.node);
          entry.node.parentNode?.removeChild(entry.node);
          nodeMap.delete(oldKey);
        }
      }
    }

    // Insert/reorder nodes (iterate in order)
    let prevNode: Node = marker;
    for (let i = 0; i < len; i++) {
      const item = items[i];
      const key = newKeys[i];

      let entry = nodeMap.get(key);
      if (!entry) {
        const indexRef = { value: i };
        const indexFn = () => indexRef.value;
        const descriptor = renderFn(item, indexFn);
        const node = resolve(descriptor);

        if (node instanceof Node) {
          entry = { node, item, index: i, indexFn, indexRef };
          nodeMap.set(key, entry);
          targetParent.insertBefore(node, prevNode.nextSibling);
        }
      } else {
        entry.item = item;
        entry.index = i;
        entry.indexRef.value = i;

        if (prevNode.nextSibling !== entry.node) {
          targetParent.insertBefore(entry.node, prevNode.nextSibling);
        }
      }

      if (entry) {
        prevNode = entry.node;
      }
    }

    currentKeys = newKeys;
  };

  registerCleanup(marker, () => disposeEffect(update));

  // Initial render with subscription
  withRenderContext(update);

  return frag as unknown as VNode;
}

/**
 * Switch/Match for reactive pattern matching
 * @example
 * <Switch fallback={<Default />}>
 *   <Match when={() => status() === 'loading'}><Spinner /></Match>
 *   <Match when={() => status() === 'error'}><Error /></Match>
 * </Switch>
 */

// Internal type for Match children passed to Switch
interface MatchChild {
  _isMatch: true;
  when: MaybeReactive<boolean>;
  children: VNode | (() => VNode);
}

export function Switch(props: {
  fallback?: VNode | (() => VNode);
  children: (MatchChild | VNode)[];
}): VNode {
  const marker = document.createComment("switch");
  // Track current nodes (support Fragments)
  let currentNodes: Node[] = [];
  let currentIndex: number = -1; // -1 means fallback

  const getFallback = () => {
    if (!props.fallback) return null;
    return typeof props.fallback === "function"
      ? resolve(props.fallback())
      : resolve(props.fallback);
  };

  const update = () => {
    const parent = marker.parentNode;
    if (!parent) return;

    // Find first matching child
    let newIndex = -1;
    let matchedChildDescriptor: VNode | null = null;

    const children = Array.isArray(props.children)
      ? props.children
      : [props.children];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      let resolvedChild: any = child;
      if (child && typeof child === 'object' && (child as any)._brand === 'component') {
         const descriptor = child as any;
         resolvedChild = descriptor.type(descriptor.props);
      }

      if (
        resolvedChild &&
        typeof resolvedChild === "object" &&
        "_isMatch" in resolvedChild &&
        (resolvedChild as MatchChild)._isMatch
      ) {
        const matchChild = resolvedChild as MatchChild;
        const condition = resolveValue(matchChild.when);
        if (condition) {
          newIndex = i;
          const c = matchChild.children;
          matchedChildDescriptor = typeof c === "function" ? c() : c;
          break;
        }
      }
    }

    // Only update DOM if the matched index changed
    if (newIndex !== currentIndex) {
      // Remove current nodes
      if (currentNodes.length > 0) {
        for (const n of currentNodes) {
          cleanupNode(n);
          n.parentNode?.removeChild(n);
        }
        currentNodes = [];
      }

      currentIndex = newIndex;

      let nextNode: Node | null | DocumentFragment = null;

      if (matchedChildDescriptor) {
        nextNode = resolve(matchedChildDescriptor);
      } else if (newIndex === -1) {
        // Show fallback
        nextNode = getFallback();
      }

      if (nextNode) {
         if (nextNode instanceof DocumentFragment) {
            currentNodes = Array.from(nextNode.childNodes);
            parent.insertBefore(nextNode, marker.nextSibling);
         } else if (nextNode instanceof Node) {
            currentNodes = [nextNode];
            parent.insertBefore(nextNode, marker.nextSibling);
         }
      }
    }
  };

  const frag = document.createDocumentFragment();
  frag.appendChild(marker);

  registerCleanup(marker, () => disposeEffect(update));

  // Initial render with subscription
  withRenderContext(update);

  return frag as unknown as VNode;
}

export function Match(props: {
  when: MaybeReactive<boolean>;
  children: VNode | (() => VNode);
}): MatchChild {
  // Return a special object that Switch can recognize
  return {
    _isMatch: true,
    when: props.when,
    children: props.children,
  } as unknown as MatchChild;
}
