import { useEffect, useState, type SetStateAction } from "react";
// UI-only filters survive page navigation, and reset when the window reloads.
// They never become part of financial data or backups.
const filters = new Map<string, string>();
const resets = new Set<() => void>();
export function useViewFilter(key: string, initial = "") {
  const [value, setValue] = useState(() => filters.get(key) ?? initial);
  useEffect(() => {
    const reset = () => setValue(initial);
    resets.add(reset);
    return () => {
      resets.delete(reset);
    };
  }, [key, initial]);
  const update = (next: SetStateAction<string>) => {
    const resolved =
      typeof next === "function" ? next(filters.get(key) ?? initial) : next;
    filters.set(key, resolved);
    setValue(resolved);
  };
  return [value, update] as const;
}

export function resetViewFilters() {
  filters.clear();
  resets.forEach((reset) => reset());
}
