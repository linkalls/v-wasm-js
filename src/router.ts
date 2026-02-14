import { v, get, set, onCleanup, type VAtom } from "./core";
import { Show } from "./flow";
import { h } from "./jsx-runtime";

export interface LocationState {
  path: string;
  query: string;
  hash: string;
}

const getWindowLocation = (): LocationState => ({
  path: window.location.pathname,
  query: window.location.search,
  hash: window.location.hash
});

export const location: VAtom<LocationState> = v(getWindowLocation());

export function navigate(to: string) {
  window.history.pushState(null, "", to);
  set(location, getWindowLocation());
}

export function Router(props: { children: any }) {
  const update = () => set(location, getWindowLocation());
  window.addEventListener("popstate", update);
  onCleanup(() => window.removeEventListener("popstate", update));
  return props.children;
}

export function Route(props: { path: string; children: any }) {
  return Show({
    when: () => {
      const current = get(location).path;
      if (props.path === "*") return true;
      if (props.path === current) return true;
      if (props.path.endsWith("*")) {
        const base = props.path.slice(0, -1);
        return current.startsWith(base);
      }
      return false;
    },
    children: props.children
  });
}

export function A(props: { href: string; class?: string; className?: string; children?: any }) {
  const onClick = (e: MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(props.href);
  };

  return h('a', { ...props, onClick }, props.children);
}
