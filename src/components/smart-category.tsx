import { useState } from "react";
import { Sparkles } from "lucide-react";
import { detectCategory, type CategoryRecord } from "../suggestions";
export function useSmartCategory(
  initial: string,
  editing: boolean,
  history: readonly CategoryRecord[],
) {
  const [category, setCategory] = useState(initial),
    [automatic, setAutomatic] = useState(!editing),
    [inference, setInference] =
      useState<ReturnType<typeof detectCategory>>(null);
  function infer(name: string) {
    const next = detectCategory(name, history);
    setCategory(next?.category ?? initial);
    setInference(next);
  }
  return {
    category,
    automatic,
    inference,
    onName: (name: string) => {
      if (automatic) infer(name);
    },
    choose: (value: string) => {
      setAutomatic(false);
      setCategory(value);
      setInference(null);
    },
    resume: (name: string) => {
      setAutomatic(true);
      infer(name);
    },
  };
}
export function CategoryHint({
  state,
  name,
}: {
  state: ReturnType<typeof useSmartCategory>;
  name: string;
}) {
  return (
    <span className="category-hint">
      <Sparkles size={14} />
      <span>
        {state.automatic
          ? state.inference
            ? `${state.category} sugerida ${state.inference.source === "history" ? "pelo seu histórico" : "pelo nome"}. Você pode alterar.`
            : "A categoria será sugerida pelo nome quando houver correspondência."
          : "Categoria escolhida por você."}
      </span>
      {!state.automatic && (
        <button type="button" onClick={() => state.resume(name)}>
          Detectar pelo nome
        </button>
      )}
    </span>
  );
}
