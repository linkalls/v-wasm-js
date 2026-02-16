import type { VNode, ComponentDescriptor, ServerElement, Child } from '../jsx-runtime';

const voidTags = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderToString(node: Child): string {
  if (node === null || node === undefined || node === false || node === true) {
    return '';
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return escapeHtml(String(node));
  }

  if (Array.isArray(node)) {
    return node.map(renderToString).join('');
  }

  if (typeof node === 'function') {
    try {
      const result = node();
      return renderToString(result);
    } catch (e) {
      // Allow Suspense-style promise throwing to bubble to an async renderer.
      if (e && typeof (e as any).then === 'function') throw e;
      console.error('Error executing reactive function in SSR:', e);
      return '';
    }
  }

  // Handle VNode objects
  if (typeof node === 'object') {
    // Component Descriptor
    if ('_brand' in node && node._brand === 'component') {
      const descriptor = node as ComponentDescriptor;
      try {
        const result = descriptor.type(descriptor.props);
        return renderToString(result);
      } catch (e) {
        if (e && typeof (e as any).then === 'function') throw e;
        throw e;
      }
    }

    // Server Element
    if ('_brand' in node && node._brand === 'server-element') {
      const el = node as ServerElement;
      const tagName = el.type;
      let attrs = '';
      let innerHTML = '';

      const keys = Object.keys(el.props);
      for (const key of keys) {
        if (key === 'children' || key === 'ref' || key.startsWith('on')) continue;

        let value = el.props[key];

        // Resolve reactive function if needed
        if (typeof value === 'function') {
          try {
            value = value();
          } catch {
            value = undefined;
          }
        }

        if (key === 'innerHTML' || key === 'textContent') {
          // Special handling for innerHTML/textContent props
          const val = String(value ?? '');
          if (key === 'textContent') {
            innerHTML = escapeHtml(val);
          } else {
            innerHTML = val;
          }
          continue;
        }

        if (value === true) {
          attrs += ` ${key}`;
        } else if (value !== false && value != null) {
          if (key === 'style' && typeof value === 'object') {
            const styleStr = Object.entries(value)
              .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
              .join(';');
            attrs += ` style="${escapeHtml(styleStr)}"`;
          } else if (key === 'class' || key === 'className') {
            attrs += ` class="${escapeHtml(String(value))}"`;
          } else {
            attrs += ` ${key}="${escapeHtml(String(value))}"`;
          }
        }
      }

      if (voidTags.has(tagName)) {
        return `<${tagName}${attrs} />`;
      }

      const childrenStr = innerHTML || el.children.map(renderToString).join('');
      return `<${tagName}${attrs}>${childrenStr}</${tagName}>`;
    }

    // Fragment (handled as array or object depending on runtime)
    // If runtime returns DocumentFragment, we can't easily handle it here in Node env.
    // But our modified runtime returns Array for Fragment in SSR.
    // If strict checks fail, we might fall through here.
  }

  return '';
}
