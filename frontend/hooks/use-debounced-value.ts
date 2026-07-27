"use client";

import { useEffect, useState } from "react";

/**
 * Delays a value so typing in a search box does not fire a request per
 * keystroke. Section 6.2 requires searching to hit the API, so the debounce is
 * what keeps that affordable.
 */
export const useDebouncedValue = <T,>(value: T, delay = 350): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
