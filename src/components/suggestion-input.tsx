import { useId, useRef, useState, type InputHTMLAttributes } from "react";
import { completionFor } from "../suggestions";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: string;
  suggestions: readonly string[];
  onValueChange: (value: string) => void;
};
export function SuggestionInput({
  value,
  suggestions,
  onValueChange,
  maxLength = 100,
  onKeyDown,
  onFocus,
  onBlur,
  onSelect,
  onScroll,
  ...props
}: Props) {
  const id = useId(),
    ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false),
    [typed, setTyped] = useState(false),
    [dismissed, setDismissed] = useState(false),
    [atEnd, setAtEnd] = useState(true),
    [composing, setComposing] = useState(false),
    [scroll, setScroll] = useState(0);
  const completion =
    focused &&
    typed &&
    !dismissed &&
    atEnd &&
    !composing &&
    !props.disabled &&
    !props.readOnly
      ? completionFor(value, suggestions, maxLength)
      : null;
  function caret() {
    const input = ref.current;
    if (input) {
      setAtEnd(
        input.selectionStart === input.value.length &&
          input.selectionEnd === input.value.length,
      );
      setScroll(input.scrollLeft);
    }
  }
  return (
    <span className="suggestion-input">
      <input
        {...props}
        ref={ref}
        type="text"
        autoComplete="off"
        maxLength={maxLength}
        value={value}
        aria-autocomplete="inline"
        aria-describedby={
          [props["aria-describedby"], completion ? id : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onChange={(event) => {
          setTyped(true);
          setDismissed(false);
          onValueChange(event.target.value);
          caret();
        }}
        onFocus={(event) => {
          setFocused(true);
          caret();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onSelect={(event) => {
          caret();
          onSelect?.(event);
        }}
        onScroll={(event) => {
          caret();
          onScroll?.(event);
        }}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => {
          setComposing(false);
          caret();
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (
            event.defaultPrevented ||
            event.nativeEvent.isComposing ||
            composing
          )
            return;
          if (event.key === "Escape" && completion) {
            event.preventDefault();
            event.stopPropagation();
            setDismissed(true);
          }
          if (
            event.key === "Tab" &&
            !event.shiftKey &&
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            completion &&
            ref.current?.selectionStart === value.length &&
            ref.current.selectionEnd === value.length
          ) {
            event.preventDefault();
            onValueChange(completion.accepted);
            setDismissed(true);
            requestAnimationFrame(() => {
              ref.current?.setSelectionRange(
                completion.accepted.length,
                completion.accepted.length,
              );
              caret();
            });
          }
        }}
      />
      {completion && (
        <>
          <span className="input-ghost" aria-hidden="true">
            <span style={{ transform: `translateX(${-scroll}px)` }}>
              <span className="ghost-prefix">{value}</span>
              <span className="ghost-suffix">{completion.suffix}</span>
            </span>
          </span>
          <kbd className="suggestion-key" aria-hidden="true">
            Tab
          </kbd>
          <span id={id} hidden>
            Sugestão: {completion.accepted}. Pressione Tab para aceitar ou Esc
            para dispensar.
          </span>
        </>
      )}
    </span>
  );
}
