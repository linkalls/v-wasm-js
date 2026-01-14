import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div className="card">
      <h3>Counter with Derived Value</h3>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button onClick={() => setCount(c => c - 1)}>-</button>
        <span id="counter" style={{ fontSize: '2rem', minWidth: '4rem', textAlign: 'center' }}>
          {count}
        </span>
        <span style={{ color: '#888' }}>
          (×2 = {count * 2})
        </span>
        <button onClick={() => setCount(c => c + 1)}>+</button>
      </div>
    </div>
  )
}

function TodoList() {
  const [todos, setTodos] = useState<string[]>([])
  const [inputVal, setInputVal] = useState('')

  const addTodo = () => {
    const text = inputVal.trim()
    if (text) {
      setTodos(t => [...t, text])
      setInputVal('')
    }
  }

  const removeTodo = (index: number) => {
    setTodos(t => t.filter((_, i) => i !== index))
  }

  return (
    <div className="card">
      <h3>Todo List</h3>
      <div style={{ display: 'flex' }}>
        <input
          type="text"
          placeholder="Add todo..."
          style={{ padding: '0.5rem', marginRight: '0.5rem', flex: 1 }}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
        />
        <button onClick={addTodo}>Add</button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
        {todos.map((todo, i) => (
          <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#f5f5f5', marginBottom: '0.25rem', borderRadius: '4px' }}>
            <span>{todo}</span>
            <button
              style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0 0.5rem' }}
              onClick={() => removeTodo(i)}
            >×</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function App() {
  return (
    <div>
      <h1>React Demo</h1>
      <Counter />
      <TodoList />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
