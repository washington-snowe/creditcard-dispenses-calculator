import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import {
  findFunctions,
  SEARCH_EXAMPLES,
  NAV_GROUPS,
  type PageId,
} from "../navigation";
import { Dialog } from "./ui";

export function NavigationSearch({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate: (id: PageId) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const option = useRef<HTMLButtonElement>(null);
  const id = useId();
  const results = findFunctions(query);
  const visible = open || dialog;
  useEffect(() => {
    option.current?.scrollIntoView({ block: "nearest" });
  }, [selected, query, visible]);
  useEffect(() => {
    setOpen(false);
    setDialog(false);
    setQuery("");
    setSelected(0);
  }, [collapsed]);
  function choose(page: PageId) {
    setOpen(false);
    setDialog(false);
    setQuery("");
    setSelected(0);
    onNavigate(page);
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>("main h1")?.focus(),
    );
  }
  const field = (
    <>
      <div className="function-search-field">
        <Search size={17} aria-hidden="true" />
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-label="Buscar funções"
          placeholder="Buscar funções…"
          aria-expanded={visible}
          aria-controls={visible ? `${id}-results` : undefined}
          aria-activedescendant={
            visible && results[selected]
              ? `${id}-${results[selected].id}`
              : undefined
          }
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Escape" && !dialog && open) {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setSelected((n) =>
                !visible
                  ? e.key === "ArrowDown"
                    ? 0
                    : Math.max(0, results.length - 1)
                  : results.length
                    ? (n + (e.key === "ArrowDown" ? 1 : -1) + results.length) %
                      results.length
                    : 0,
              );
            }
            if (e.key === "Enter" && visible && results[selected]) {
              e.preventDefault();
              choose(results[selected].id);
            }
          }}
        />
        {query && (
          <button
            type="button"
            className="function-search-clear"
            aria-label="Limpar busca de funções"
            onClick={() => {
              setQuery("");
              setSelected(0);
              input.current?.focus();
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>
      {visible && (
        <div className="function-search-panel">
          {!query.trim() && (
            <div className="function-search-examples">
              <small>Experimente procurar</small>
              <div>
                {SEARCH_EXAMPLES.slice(0, dialog ? 8 : 4).map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setQuery(example);
                      setSelected(0);
                      input.current?.focus();
                    }}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
          <small className="function-search-caption">
            {query.trim() ? "Funções encontradas" : "Acessos sugeridos"}
          </small>
          <div
            className="function-search-results"
            id={`${id}-results`}
            role="listbox"
            aria-label="Sugestões de funções"
          >
            {results.map((item, index) => (
              <button
                type="button"
                role="option"
                aria-selected={selected === index}
                tabIndex={-1}
                id={`${id}-${item.id}`}
                key={item.id}
                ref={index === selected ? option : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(item.id)}
              >
                <item.icon size={18} aria-hidden="true" />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                  <em>
                    {
                      NAV_GROUPS.find((group) => group.ids.includes(item.id))
                        ?.title
                    }
                  </em>
                </span>
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
          {!results.length && (
            <p role="status" className="function-search-empty">
              Nenhuma função encontrada. Tente “cartões”, “salário”, “parcelas”
              ou “backup”.
            </p>
          )}
          <span className="sr-only" role="status" aria-live="polite">
            {query.trim()
              ? `${results.length} funções encontradas`
              : "Sugestões disponíveis"}
          </span>
          <small className="function-search-help">
            ↑ ↓ selecionar · Enter abrir · Esc fechar
          </small>
        </div>
      )}
    </>
  );
  return (
    <>
      {collapsed ? (
        <button
          type="button"
          className="function-search-launch"
          aria-label="Buscar funções no menu"
          title="Buscar funções"
          onClick={() => {
            setDialog(true);
            setSelected(0);
          }}
        >
          <Search size={20} />
        </button>
      ) : (
        <div
          className="function-search"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
          }}
        >
          {field}
        </div>
      )}
      {dialog && (
        <Dialog
          title="Encontrar uma função"
          subtitle="Procure pelo nome ou pelo que você quer fazer."
          onClose={() => {
            setDialog(false);
            setOpen(false);
          }}
        >
          <div className="function-search function-search-modal">{field}</div>
        </Dialog>
      )}
    </>
  );
}
