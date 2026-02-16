import {
  Router,
  Routes,
  Route,
  Outlet,
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
          <A href="/users/42" data-testid="link-user-42">/users/42</A>
        </li>
        <li>
          <A href="/users/99?tab=info" data-testid="link-user-99">/users/99?tab=info</A>
        </li>
        <li>
          <A href="/form" data-testid="link-form">/form</A>
        </li>
      </ul>
    </div>
  );
}

// NotFound route omitted in demo (router is not exclusive yet)

function NotFound() {
  return (
    <div>
      <h1 data-testid="notfound-title">404</h1>
      <A href="/">back</A>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Suspense fallback={<div>loading...</div>}>
        <Routes>
          <Route path="/">{() => <Home />}</Route>

          <Route path="/users/*" id="users">
            {() => (
              <div>
                <div data-testid="users-layout">Users layout</div>
                <Outlet />
              </div>
            )}

            <Route
              id="user"
              path=":id"
              loader={({ params, search }) => {
                const tab = search.get("tab") ?? "(none)";
                return {
                  id: params.id,
                  tab,
                  count: get(apiCount),
                };
              }}
              action={(_, input: { inc: number }) => {
                set(apiCount, (c) => c + input.inc);
                return { ok: true as const };
              }}
            >
              {(data, ctx) => (
                <div>
                  <h1 data-testid="user-title">User {data.id}</h1>
                  <div data-testid="user-tab">tab: {data.tab}</div>
                  <div data-testid="user-count">loader count: {data.count}</div>

                  <Form action={ctx.action} showError>
                    <input type="hidden" name="inc" value="1" />
                    <button type="submit" data-testid="btn-inc">inc</button>
                  </Form>

                  <p>
                    <A href="/">back</A>
                  </p>
                </div>
              )}
            </Route>

            <Route path="*">{() => <div data-testid="users-404">users 404</div>}</Route>
          </Route>

          <Route path="/form" id="form">
            {() => <FormDemo />}
          </Route>

          <Route path="*">{() => <NotFound />}</Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

const formResult = v<any>({ agree: false, tags: [] as string[] });

function FormDemo() {
  return (
    <div>
      <h1>Form</h1>
      <Form
        action={{
          run: async (input: any) => {
            // normalize checkbox default
            const agree = Boolean(input.agree);
            const tags = input.tags
              ? Array.isArray(input.tags)
                ? input.tags
                : [input.tags]
              : [];
            set(formResult, { agree, tags });
            return { ok: true };
          },
          pending: () => false,
          error: () => undefined,
          data: () => undefined,
        }}
      >
        <label>
          <input data-testid="agree" type="checkbox" name="agree" value="true" /> agree
        </label>

        <div>
          <label>
            <input data-testid="tag1" type="checkbox" name="tags" value="1" /> tag1
          </label>
          <label>
            <input data-testid="tag2" type="checkbox" name="tags" value="2" /> tag2
          </label>
        </div>

        <button data-testid="submit" type="submit">submit</button>
      </Form>

      <pre data-testid="result">{() => JSON.stringify(get(formResult))}</pre>

      <A href="/">back</A>
    </div>
  );
}

render(<App />, document.getElementById("app"));
