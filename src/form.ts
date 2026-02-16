import { h } from "./jsx-runtime";
import type { ActionApi } from "./router";

export function Form<TInput = any>(props: {
  action: ActionApi<TInput, any>;
  value: TInput | (() => TInput);
  children: any;
  disabled?: boolean;
}) {
  const onSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    const val = typeof props.value === "function" ? (props.value as any)() : props.value;
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
