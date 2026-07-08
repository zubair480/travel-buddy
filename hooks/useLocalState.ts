"use client";

import { useEffect, useState } from "react";

export function useLocalState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      setValue(JSON.parse(raw) as T);
    }
    setIsReady(true);
  }, [key]);

  useEffect(() => {
    if (isReady) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, [isReady, key, value]);

  return [value, setValue, isReady] as const;
}
