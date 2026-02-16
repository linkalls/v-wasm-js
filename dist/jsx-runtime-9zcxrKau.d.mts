//#region src/jsx-runtime.d.ts
/**
 * V-Signal JSX Runtime
 * Standard JSX runtime exports for react-jsx transform
 */
type ComponentDescriptor = {
  _brand: "component";
  type: Component;
  props: Props;
};
type ServerElement = {
  _brand: "server-element";
  type: string;
  props: Props;
  children: Child[];
};
type VNode = Element | Text | DocumentFragment | ComponentDescriptor | ServerElement;
type Child = VNode | string | number | boolean | null | undefined | (() => string | number | VNode);
type Children = Child | Child[];
type Props = Record<string, any> & {
  children?: Children;
};
type Component = (props: Props) => VNode;
type CleanupFn = () => void;
declare function registerCleanup(node: Node, cleanup: CleanupFn): void;
declare function cleanupNode(node: Node): void;
/**
 * JSX Factory function (jsx/jsxs for react-jsx transform)
 */
declare function jsx(type: string | Component, props: Props | null, _key?: string): VNode;
declare const jsxs: typeof jsx;
declare const jsxDEV: typeof jsx;
/**
 * JSX Factory function (h for classic mode)
 */
declare function h(type: string | Component, props: Props | null, ...children: any[]): VNode;
declare function resolve(child: any): Node | null;
/**
 * Fragment support
 */
declare function Fragment(props: {
  children?: any[];
}): DocumentFragment | any[];
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    type Element = VNode;
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  type Element = VNode;
  interface ElementChildrenAttribute {
    children: {};
  }
}
//#endregion
export { JSX as a, VNode as c, jsx as d, jsxDEV as f, resolve as h, Fragment as i, cleanupNode as l, registerCleanup as m, Children as n, Props as o, jsxs as p, ComponentDescriptor as r, ServerElement as s, Child as t, h as u };
//# sourceMappingURL=jsx-runtime-9zcxrKau.d.mts.map