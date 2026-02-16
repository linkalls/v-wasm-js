import { h } from "./jsx-runtime";
import type { ActionApi } from "./router";

function coerceScalar(value: any): any {
  if (typeof value !== "string") return value;

  const s = value.trim();
  if (s === "") return s;

  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null") return null;
  if (s === "undefined") return undefined;

  // number-ish (avoid converting things like "00123"? we keep it simple)
  const n = Number(s);
  if (!Number.isNaN(n) && String(n) === s) return n;

  return value;
}

function formDataToObject(fd: FormData, coerce: boolean): Record<string, any> {
  const out: Record<string, any> = {};

  for (const [k, v] of fd.entries()) {
    const raw = typeof v === "string" ? v : v; // File stays as File
    const value = coerce ? coerceScalar(raw) : raw;

    if (k in out) {
      const prev = out[k];
      out[k] = Array.isArray(prev) ? [...prev, value] : [prev, value];
    } else {
      out[k] = value;
    }
  }

  return out;
}

export function Form<TInput = any>(props: {
  action: ActionApi<TInput, any>;
  /**
   * Optional explicit value.
   * If omitted, the value is collected from <input name=...> via FormData.
   */
  value?: TInput | (() => TInput);
  /**
   * When collecting from FormData, coerce common scalars:
   * - "true"/"false" -> boolean
   * - numeric strings -> number
   * - "null" -> null
   * Default: true (ergonomic for small apps)
   */
  coerce?: boolean;
  /** Render action error under the form when true (default: false). */
  showError?: boolean;
  children: any;
  disabled?: boolean;
}) {
  const onSubmit = (e: SubmitEvent) => {
    e.preventDefault();

    let val: any;
    if (typeof props.value !== "undefined") {
      val = typeof props.value === "function" ? (props.value as any)() : props.value;
    } else {
      const form = e.currentTarget as HTMLFormElement;
      const fd = new FormData(form);
      val = formDataToObject(fd, props.coerce ?? true);

      // Checkbox ergonomics: if a checkbox is unchecked, it does not appear in FormData.
      // We intentionally keep this as-is for flexibility. Apps can normalize defaults.
    }

    props.action.run(val);
  };

  const disabled = props.disabled ?? false;

  const formEl = h(
    "form",
    {
      onSubmit,
      // Disable pointer interactions when pending (best-effort)
      "aria-busy": () => (props.action.pending() ? "true" : "false"),
      style: () =>
        props.action.pending() || disabled
          ? "pointer-events:none;opacity:0.7;"
          : "",
    },
    props.children,
  );

  if (!props.showError) return formEl;

  // Render error under the form when enabled.
  return h(
    "div",
    {},
    formEl,
    () => {
      const err = props.action.error();
      if (!err) return null;
      const msg = err instanceof Error ? err.stack || err.message : String(err);
      return h(
        "pre",
        { style: "color:#b00020;white-space:pre-wrap;margin:0.5rem 0 0;" },
        msg,
      );
    },
  );
}
