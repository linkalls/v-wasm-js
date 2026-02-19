/**
 * Vitrio Demo Application
 * React-like TSX with derive() API
 */

import { v, derive, get, set, subscribe, render, For, Show } from '../../src/index'
import type { VNode } from '../../src/jsx-runtime'

// =====================
// Atoms Definition
// =====================

const countAtom = v(0)
const doubledAtom = derive(get => get(countAtom) * 2)
type TodoItem = { id: number; text: string }

const todosAtom = v<TodoItem[]>([])
const nextTodoIdAtom = v(0)
const inputAtom = v('')
const showDetailsAtom = v(false)
const showRestAtom = v(false)

// =====================
// React-like Components
// =====================

function Counter() {

  return (
    <div class="card">
      <h3>Counter with Derived Value</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <button onClick={() => set(countAtom, c => c - 1)}>-</button>
        <span id="counter" style="font-size: 2rem; min-width: 4rem; text-align: center;">
          {() => get(countAtom)}
        </span>
        <span style="color: #888;">
          (×2 = {() => get(doubledAtom)})
        </span>
        <button onClick={() => set(countAtom, c => c + 1)}>+</button>
      </div>
    </div>
  )
}

function TodoList() {
  return (
    <div class="card">
      <h3>Todo List</h3>
      <div style="display: flex;">
        <input 
          type="text"
          placeholder="Add todo..."
          style="padding: 0.5rem; margin-right: 0.5rem; flex: 1;"
          ref={(el: HTMLInputElement) => {
            el.oninput = () => set(inputAtom, el.value)
            subscribe(inputAtom, () => { el.value = get(inputAtom) })
          }}
        />
        <button onClick={() => {
          const text = get(inputAtom).trim()
          if (text) {
            const nextId = get(nextTodoIdAtom)
            set(nextTodoIdAtom, nextId + 1)
            set(todosAtom, todos => [...todos, { id: nextId, text }])
            set(inputAtom, '')
          }
        }}>Add</button>
      </div>
      <ul style="list-style: none; padding: 0; margin-top: 1rem;">
        <For each={() => get(todosAtom)} key={(todo) => todo.id}>
          {(todo: TodoItem) => (
            <li style="display: flex; justify-content: space-between; padding: 0.5rem; background: #f5f5f5; margin-bottom: 0.25rem; border-radius: 4px;">
              <span>{todo.text}</span>
              <button 
                style="background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer; padding: 0 0.5rem;"
                onClick={() => set(todosAtom, todos => todos.filter(item => item.id !== todo.id))}
              >×</button>
            </li>
          )}
        </For>
      </ul>
    </div>
  )
}

function ToggleSection() {
  return (
    <div class="card">
      <h3>Toggle Demo</h3>
      <button onClick={() => set(showDetailsAtom, s => !s)}>
        {() => get(showDetailsAtom) ? 'Hide Details' : 'Show Details'}
      </button>
      <Show when={() => get(showDetailsAtom)}>
        <div style="margin-top: 1rem; padding: 1rem; background: #e8f4e8; border-radius: 4px;">
          <strong>V-Signal Features:</strong>
          <ul>
            <li><code>v()</code> - Create reactive state</li>
            <li><code>derive()</code> - Derived values</li>
            <li><code>use()</code> - Hook for components</li>
            <li><code>Show/For</code> - Control flow</li>
          </ul>
        </div>
      </Show>
    </div>
  )
}

function ApiReference() {
  return (
    <div class="card">
      <h3>API Reference</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 0.5rem;"><code>v(initial)</code></td>
          <td style="padding: 0.5rem;">Create reactive state</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 0.5rem;"><code>derive(fn)</code></td>
          <td style="padding: 0.5rem;">Derived/computed value</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 0.5rem;"><code>get(atom)</code></td>
          <td style="padding: 0.5rem;">Read value</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 0.5rem;"><code>set(atom, value)</code></td>
          <td style="padding: 0.5rem;">Update value</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 0.5rem;"><code>subscribe(atom, fn)</code></td>
          <td style="padding: 0.5rem;">Listen to changes</td>
        </tr>
        <tr>
          <td style="padding: 0.5rem;"><code>use(atom)</code></td>
          <td style="padding: 0.5rem;">[value, setter] for components</td>
        </tr>
      </table>
    </div>
  )
}

function DeferredSections() {
  return (
    <>
      <TodoList />
      <ToggleSection />
      <ApiReference />
    </>
  )
}

function App() {
  return (
    <div>
      <h1>V-Signal Demo</h1>
      <p style="color: #666; margin-bottom: 2rem;">
        Ultra-minimal reactive state management with derive() API
      </p>
      <Counter />
      <Show when={() => get(showRestAtom)}>
        {() => <DeferredSections />}
      </Show>
    </div>
  )
}

// =====================
// Initialize
// =====================

type BenchApi = {
  bumpCount: (n: number) => void
}

// Expose a tiny benchmark API for Playwright.
;(window as unknown as { __bench?: BenchApi }).__bench = {
  bumpCount(n: number) {
    // Deterministic workload: n propagate calls.
    for (let i = 0; i < n; i++) {
      set(countAtom, c => c + 1)
    }
  },
}

const root = document.getElementById('app')
if (root) {
  ;(window as { __vitrioHydrated?: boolean }).__vitrioHydrated = false
  requestAnimationFrame(() => {
    render(<App />, root)
    requestAnimationFrame(() => {
      set(showRestAtom, true)
      ;(window as { __vitrioHydrated?: boolean }).__vitrioHydrated = true
    })
  })
}
