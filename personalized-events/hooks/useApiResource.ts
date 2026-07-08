"use client";

import { useCallback, useEffect, useState } from "react";
import type { DependencyList } from "react";
import { ApiError } from "@/lib/api";

export function useApiResource<T>(loader: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const nextData = await loader();
      setData(nextData);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, deps);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, error, isLoading, setData, refresh };
}
