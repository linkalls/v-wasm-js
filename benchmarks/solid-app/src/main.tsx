import { createSignal, createMemo, For } from 'solid-js';
import { render } from 'solid-js/web';

// Global state to match Vitrio example
const [count, setCount] = createSignal(0);
const doubled = createMemo(() => count() * 2);
const [todos, setTodos] = createSignal<string[]>([]);
const [inputVal, setInputVal] = createSignal('');
const [showDetails, setShowDetails] = createSignal(false);

function Counter() {
  return (
    <div class="card">
      <h3>Counter with Derived Value</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <button onClick={() => setCount(c => c - 1)}>-</button>
        <span id="counter" style="font-size: 2rem; min-width: 4rem; text-align: center;">
          {count()}
        </span>
        <span style="color: #888;">
          (×2 = {doubled()})
        </span>
        <button onClick={() => setCount(c => c + 1)}>+</button>
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
          value={inputVal()}
          onInput={(e) => setInputVal(e.currentTarget.value)}
        />
        <button onClick={() => {
          const text = inputVal().trim();
          if (text) {
            setTodos(t => [...t, text]);
            setInputVal('');
          }
        }}>Add</button>
      </div>
      <ul style="list-style: none; padding: 0; margin-top: 1rem;">
        <For each={todos()}>
            {(todo, i) => (
                <li style="display: flex; justify-content: space-between; padding: 0.5rem; background: #f5f5f5; margin-bottom: 0.25rem; border-radius: 4px;">
                    <span>{todo}</span>
                    <button
                      style="background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer; padding: 0 0.5rem;"
                      onClick={() => setTodos(t => t.filter((_, j) => j !== i()))}
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
            <button onClick={() => setShowDetails(s => !s)}>
                {showDetails() ? 'Hide Details' : 'Show Details'}
            </button>
            <div
                style={{
                    "margin-top": "1rem",
                    "padding": "1rem",
                    "background": "#e8f4e8",
                    "border-radius": "4px",
                    "display": showDetails() ? 'block' : 'none'
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
      <h1>SolidJS Demo</h1>
      <p style="color: #666; margin-bottom: 2rem;">
        Benchmark comparison
      </p>
      <Counter />
      <TodoList />
      <ToggleSection />
      <ApiReference />
    </div>
  )
}

const root = document.getElementById('app');
if (root) render(() => <App />, root);