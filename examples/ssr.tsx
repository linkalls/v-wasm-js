/** @jsxImportSource ../src */
import { renderToString } from "../src/server";
import { v, get } from "../src/core";

// Define a component
function App() {
  const count = v(0);
  return (
    <div id="app">
      <h1>Hello SSR</h1>
      <p>Count: {() => get(count)}</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
      <button class="btn" disabled={true}>Click me</button>
      <input type="text" value="test" />
      <>
        <span>Frag 1</span>
        <span>Frag 2</span>
      </>
      <div style={{ color: "red", fontSize: "12px" }}>Styled</div>
      <div textContent="<script>alert('xss')</script>"></div>
    </div>
  );
}

// Render
try {
  const html = renderToString(<App />);
  console.log("Output HTML:");
  console.log(html);
} catch (e) {
  console.error("SSR Error:", e);
  process.exit(1);
}
