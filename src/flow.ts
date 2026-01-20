/**
 * V-Signal Control Flow Components
 * Solid-style Show/For/Switch with marker-based DOM updates
 */

import { cleanupNode, registerCleanup, type VNode } from "./jsx-runtime";
import { disposeEffect, withRenderContext } from "./core";

type MaybeReactive<T> = T | (() => T);

function resolve<T>(value: MaybeReactive<T>): T {
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
  let currentNode: Node | null = null;
  let showingFallback = false;

  // Extract first child (JSX passes as array)
  const getChild = () => {
    const c = Array.isArray(props.children)
      ? props.children[0]
      : props.children;
    return typeof c === "function" ? c() : c;
  };
  const getFallback = () => {
    if (!props.fallback) return null;
    const f = Array.isArray(props.fallback)
      ? props.fallback[0]
      : props.fallback;
    return typeof f === "function" ? f() : f;
  };

  const update = () => {
    const condition = resolve(props.when);
    const parent = marker.parentNode;

    if (condition) {
      // Show main content
      if (showingFallback && currentNode) {
        currentNode.parentNode?.removeChild(currentNode);
        currentNode = null;
      }

      if (!currentNode || showingFallback) {
        const child = getChild();
        if (child instanceof Node) {
          currentNode = child;
          parent?.insertBefore(child, marker.nextSibling);
        }
        showingFallback = false;
      }
    } else {
      // Show fallback or nothing
      if (currentNode && !showingFallback) {
        currentNode.parentNode?.removeChild(currentNode);
        currentNode = null;
      }

      if (props.fallback && !showingFallback) {
        const fallback = getFallback();
        if (fallback instanceof Node) {
          currentNode = fallback.cloneNode(true);
          parent?.insertBefore(currentNode, marker.nextSibling);
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
    const items = resolve(props.each);
    const targetParent: Node = marker.parentNode || frag;
    const len = items.length;
    const newKeys: Key[] = new Array(len);

    for (let i = 0; i < len; i++) {
      newKeys[i] = getKey(items[i], i);
    }

    // Fast path: pure append when prefix is unchanged
    if (currentKeys.length > 0 && len >= currentKeys.length) {
      let isPrefix = true;
      for (let i = 0; i < currentKeys.length; i++) {
        if (currentKeys[i] !== newKeys[i]) {
          isPrefix = false;
          break;
        }
      }

      if (isPrefix) {
        let prevNode = currentKeys.length
          ? nodeMap.get(currentKeys[currentKeys.length - 1])?.node || marker
          : marker;

        for (let i = currentKeys.length; i < len; i++) {
          const key = newKeys[i];
          const indexRef = { value: i };
          const indexFn = () => indexRef.value;
          const node = renderFn(items[i], indexFn);
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
    if (currentKeys.length > 0 && len <= currentKeys.length) {
      let nextIdx = 0;
      for (let i = 0; i < currentKeys.length && nextIdx < len; i++) {
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
        const node = renderFn(item, indexFn);
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
  let currentNode: Node | null = null;
  let currentIndex: number = -1; // -1 means fallback

  const getFallback = () => {
    if (!props.fallback) return null;
    return typeof props.fallback === "function"
      ? props.fallback()
      : props.fallback;
  };

  const update = () => {
    const parent = marker.parentNode;
    if (!parent) return;

    // Find first matching child
    let newIndex = -1;
    let matchedChild: VNode | null = null;

    const children = Array.isArray(props.children)
      ? props.children
      : [props.children];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (
        child &&
        typeof child === "object" &&
        "_isMatch" in child &&
        (child as MatchChild)._isMatch
      ) {
        const matchChild = child as MatchChild;
        const condition = resolve(matchChild.when);
        if (condition) {
          newIndex = i;
          const c = matchChild.children;
          matchedChild = typeof c === "function" ? c() : c;
          break;
        }
      }
    }

    // Only update DOM if the matched index changed
    if (newIndex !== currentIndex) {
      // Remove current node
      if (currentNode) {
        cleanupNode(currentNode);
        currentNode.parentNode?.removeChild(currentNode);
        currentNode = null;
      }

      currentIndex = newIndex;

      if (matchedChild instanceof Node) {
        currentNode = matchedChild;
        parent.insertBefore(matchedChild, marker.nextSibling);
      } else if (newIndex === -1) {
        // Show fallback
        const fallback = getFallback();
        if (fallback instanceof Node) {
          currentNode = fallback;
          parent.insertBefore(fallback, marker.nextSibling);
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
