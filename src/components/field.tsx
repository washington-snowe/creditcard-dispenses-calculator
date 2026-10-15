import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
  type LabelHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { parseMoney } from "../domain";
import { SuggestionInput } from "./suggestion-input";
const pendingFocus = new WeakSet<HTMLFormElement>();
function reveal(control: HTMLElement) {
  let expanded = false;
  for (let el = control.parentElement; el; el = el.parentElement)
    if (el instanceof HTMLDetailsElement && !el.open) {
      el.open = true;
      expanded = true;
    }
  const focus = () => {
    if (control.isConnected) control.focus();
  };
  // Native details content needs a rendered frame before it can receive focus.
  requestAnimationFrame(() =>
    expanded ? requestAnimationFrame(focus) : focus(),
  );
}
function validityMessage(
  control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
) {
  const v = control.validity;
  if (v.valueMissing) return "Preencha este campo.";
  if (v.rangeUnderflow)
    return `Use um valor a partir de ${control.getAttribute("min")}.`;
  if (v.rangeOverflow)
    return `Use um valor até ${control.getAttribute("max")}.`;
  if (v.stepMismatch) return "Use um número inteiro válido.";
  if (v.tooLong) return "Reduza o tamanho deste texto.";
  if (v.patternMismatch) return "Confira o formato informado.";
  return "Confira o valor informado.";
}
export function Field({
  children,
  error,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & {
  error?: string;
  "data-field"?: string;
}) {
  const id = useId();
  const [nativeError, setNativeError] = useState("");
  const message = error || nativeError;
  const name = Children.toArray(children)
    .filter((node) => typeof node === "string")
    .join("")
    .trim();
  function annotate(nodes: ReactNode): ReactNode {
    return Children.map(nodes, (node) => {
      if (!isValidElement(node)) return node;
      const el = node as ReactElement<
        Record<string, unknown> & { children?: ReactNode }
      >;
      if (
        (typeof el.type === "string" &&
          ["input", "select", "textarea"].includes(el.type)) ||
        el.type === SuggestionInput
      )
        return cloneElement(el, {
          "aria-label":
            el.props["aria-label"] ??
            (el.props["aria-labelledby"] ? undefined : name || undefined),
          "aria-invalid": message ? true : undefined,
          "aria-describedby":
            [el.props["aria-describedby"], message ? id : ""]
              .filter(Boolean)
              .join(" ") || undefined,
        });
      return el.props.children
        ? cloneElement(el, {}, annotate(el.props.children))
        : el;
    });
  }
  return (
    <label
      {...props}
      className={`form-field ${props.className ?? ""}`}
      onChange={(event) => {
        setNativeError("");
        props.onChange?.(event);
      }}
      onInvalidCapture={(event) => {
        event.preventDefault();
        const control = event.target as HTMLInputElement;
        setNativeError(validityMessage(control));
        const form = control.form;
        if (form && !pendingFocus.has(form)) {
          pendingFocus.add(form);
          reveal(control);
          requestAnimationFrame(() => pendingFocus.delete(form));
        }
      }}
    >
      {annotate(children)}
      {message && (
        <small id={id} className="field-error" role="alert">
          {message}
        </small>
      )}
    </label>
  );
}
export function useFieldFeedback() {
  const ref = useRef<HTMLFormElement>(null);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const clear = () =>
    setIssues((previous) => (Object.keys(previous).length ? {} : previous));
  function fail(field: string, message: string): null {
    setIssues({ [field]: message });
    const control = ref.current?.querySelector<HTMLElement>(
      `[data-field="${field}"] input, [data-field="${field}"] select`,
    );
    if (control) reveal(control);
    return null;
  }
  function money(
    field: string,
    value: string,
    allowZero = false,
  ): number | null {
    try {
      const cents = parseMoney(value);
      if (!allowZero && cents === 0)
        return fail(field, "Informe um valor maior que zero.");
      return cents;
    } catch {
      return fail(field, "Use um valor válido, como 150,00.");
    }
  }
  return {
    issues,
    fail,
    money,
    formProps: { ref, onChange: clear },
  };
}
