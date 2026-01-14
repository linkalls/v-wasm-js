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

function App() {
  return (
    <div>
      <h1>React Demo</h1>
      <Counter />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
