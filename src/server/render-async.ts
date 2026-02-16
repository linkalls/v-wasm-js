import { renderToString } from './render';
import type { Child } from '../jsx-runtime';

// Minimal async SSR: retries rendering while promises are thrown (Suspense-style).
export async function renderToStringAsync(node: Child): Promise<string> {
  // avoid infinite loops
  for (let i = 0; i < 50; i++) {
    try {
      return renderToString(node);
    } catch (e) {
      if (e && typeof (e as any).then === 'function') {
        await e;
        continue;
      }
      throw e;
    }
  }
  throw new Error('renderToStringAsync exceeded retry limit (possible infinite suspense loop)');
}
