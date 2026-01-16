# updateDerived queue traversal change

- `updateDerived` now iterates the queue with an index (`i`) instead of `shift()`.
- Dependents are still enqueued via `queue.push`, and the existing `visited` set continues to prevent revisits.

