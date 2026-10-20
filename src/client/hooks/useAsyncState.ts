/**
 * LAKNES Async State Management Hook
 * Prepares loading, empty, success, and error states for Google Stitch visual components.
 */

import { useState, useEffect, useCallback } from 'react';

export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  error: Error | null;
  reload: () => Promise<void>;
  setData: (data: T | null) => void;
}

export function useAsyncState<T>(
  fetcher: () => Promise<T>,
  options: {
    immediate?: boolean;
    isEmptyCondition?: (data: T) => boolean;
  } = {}
): AsyncState<T> {
  const { immediate = true, isEmptyCondition } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  const isEmpty =
    !isLoading &&
    !error &&
    (data === null ||
      (Array.isArray(data) && data.length === 0) ||
      (isEmptyCondition ? isEmptyCondition(data) : false));

  return {
    data,
    isLoading,
    isError: Boolean(error),
    isEmpty,
    error,
    reload: execute,
    setData,
  };
}
