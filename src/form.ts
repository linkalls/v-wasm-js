import { h } from "./jsx-runtime";
import type { ActionApi } from "./router";

function formDataToObject(fd: FormData): Record<string, any> {
  const out: Record<string, any> = {};

  for (const [k, v] of fd.entries()) {
    const value = typeof v === "string" ? v : v; // File stays as File

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
      val = formDataToObject(fd);
    }

    props.action.run(val);
  };

  const disabled = props.disabled ?? false;

  // Note: we intentionally keep this minimal; users can style/compose as needed.
  return h(
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
}
