import {
  Router,
  Route,
  A,
  Suspense,
  Form,
  v,
  get,
  set,
  render,
} from "../../src/index";

const apiCount = v(0);

function Home() {
  return (
    <div>
      <h1>Vitrio Router Demo</h1>
      <p>loader/action + Suspense + Form demo (SPA only)</p>
      <ul>
        <li>
          <A href="/users/42">/users/42</A>
        </li>
        <li>
          <A href="/users/99?tab=info">/users/99?tab=info</A>
        </li>
      </ul>
    </div>
  );
}

function NotFound() {
  return (
    <div>
      <h1>404</h1>
      <A href="/">back</A>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Suspense fallback={<div>loading...</div>}>
        <Route path="/">
          {() => <Home />}
        </Route>

        <Route
          id="user"
          path="/users/:id"
          loader={({ params, search }) => {
            // fake async
            const tab = search.get("tab") ?? "(none)";
            return Promise.resolve({
              id: params.id,
              tab,
              count: get(apiCount),
            });
          }}
          action={(_, input: { inc: number }) => {
            set(apiCount, (c) => c + input.inc);
            return { ok: true as const };
          }}
        >
          {(data, ctx) => (
            <div>
              <h1>User {data.id}</h1>
              <div>tab: {data.tab}</div>
              <div>loader count: {data.count}</div>

              <Form action={ctx.action} showError>
                <input type="hidden" name="inc" value="1" />
                <button type="submit">inc</button>
              </Form>

              <p>
                <A href="/">back</A>
              </p>
            </div>
          )}
        </Route>

        <Route path="*">{() => <NotFound />}</Route>
      </Suspense>
    </Router>
  );
}

render(<App />, document.getElementById("app"));
