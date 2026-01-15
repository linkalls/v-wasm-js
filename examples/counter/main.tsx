/**
 * Vitrio Demo Application
 * React-like TSX with derive() API
 */

import { v, derive, get, set, subscribe, render, initWasm } from '../../src/index'

// =====================
// Atoms Definition
// =====================

const countAtom = v(0)
const doubledAtom = derive(get => get(countAtom) * 2)
const todosAtom = v<string[]>([])
const inputAtom = v('')
const showDetailsAtom = v(false)

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
            set(todosAtom, todos => [...todos, text])
            set(inputAtom, '')
          }
        }}>Add</button>
      </div>
      <ul style="list-style: none; padding: 0; margin-top: 1rem;" ref={(el: HTMLElement) => {
        const updateList = () => {
          el.innerHTML = ''
          get(todosAtom).forEach((todo, i) => {
            const li = (
              <li style="display: flex; justify-content: space-between; padding: 0.5rem; background: #f5f5f5; margin-bottom: 0.25rem; border-radius: 4px;">
                <span>{todo}</span>
                <button 
                  style="background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer; padding: 0 0.5rem;"
                  onClick={() => set(todosAtom, todos => todos.filter((_, j) => j !== i))}
                >×</button>
              </li>
            )
            el.appendChild(li)
          })
        }
        subscribe(todosAtom, updateList)
        updateList()
      }}></ul>
    </div>
  )
}

function ToggleSection() {
  return (
    <div class="card">
      <h3>Toggle Demo</h3>
      <button ref={(el: HTMLButtonElement) => {
        const update = () => {
          el.textContent = get(showDetailsAtom) ? 'Hide Details' : 'Show Details'
        }
        el.onclick = () => set(showDetailsAtom, s => !s)
        subscribe(showDetailsAtom, update)
        update()
      }}></button>
      <div 
        style="margin-top: 1rem; padding: 1rem; background: #e8f4e8; border-radius: 4px;"
        ref={(el: HTMLElement) => {
          const update = () => {
            el.style.display = get(showDetailsAtom) ? 'block' : 'none'
          }
          subscribe(showDetailsAtom, update)
          update()
        }}
      >
        <strong>V-Signal Features:</strong>
        <ul>
          <li><code>v()</code> - Create reactive state</li>
          <li><code>derive()</code> - Derived values</li>
          <li><code>use()</code> - Hook for components</li>
          <li><code>Show/For</code> - Control flow</li>
        </ul>
      </div>
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

function App() {
  return (
    <div>
      <h1>V-Signal Demo</h1>
      <p style="color: #666; margin-bottom: 2rem;">
        Ultra-minimal reactive state management with derive() API
      </p>
      <Counter />
      <TodoList />
      <ToggleSection />
      <ApiReference />
    </div>
  )
}

// =====================
// Initialize
// =====================

// initWasm().then(() => {
  render(<App />, document.getElementById('app'))
// })

