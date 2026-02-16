/**
 * Minimal loader/action demo (SPA only)
 * Run with your existing example runner if you have one.
 */
import { Router, Route, A } from "../src/router";
import { Suspense } from "../src/boundary";
import { v, get, set } from "../src/core";

const apiCount = v(0);

function Home() {
  return (
    <div>
      <h1>Home</h1>
      <A href="/users/42">Go user 42</A>
    </div>
  );
}

export function App() {
  return (
    <Router>
      <Suspense fallback={<div>loading...</div>}>
        <Route path="/" children={<Home />} />

        <Route
          path="/users/:id"
          loader={({ params }) => {
            const count = get(apiCount);
            return Promise.resolve({ id: params.id, count });
          }}
          action={({ params }, input: { inc: number }) => {
            set(apiCount, (c) => c + input.inc);
            return Promise.resolve({ ok: true as const });
          }}
        >
          {(data, ctx) => (
            <div>
              <h1>User {data.id}</h1>
              <div>loader count: {data.count}</div>
              <button onClick={() => ctx.action.run({ inc: 1 })}>inc</button>
              {() => (ctx.action.pending() ? <div>pending...</div> : null)}
              <div>
                <A href="/">back</A>
              </div>
            </div>
          )}
        </Route>
      </Suspense>
    </Router>
  );
}
