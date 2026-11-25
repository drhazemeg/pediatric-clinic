import type { useNavigate } from '@tanstack/react-router';

import { useEffect, useRef, useState } from 'react';

export function useDebouncedSearch(
  initialValue: string,
  delay = 300,
): [string, string, React.Dispatch<React.SetStateAction<string>>] {
  const [prevInitial, setPrevInitial] = useState(initialValue);
  const [inputValue, setInputValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  if (prevInitial !== initialValue) {
    setPrevInitial(initialValue);
    setInputValue(initialValue);
    setDebouncedValue(initialValue);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, delay);

    return () => clearTimeout(timer);
  }, [inputValue, delay]);

  return [inputValue, debouncedValue, setInputValue];
}

export function useDebouncedNavigate(
  localSearch: string,
  searchText: string,
  navigate: ReturnType<typeof useNavigate>,
  extraParams?: Record<string, string | number | boolean | undefined>,
  delay = 300,
) {
  const latestRef = useRef({ searchText, navigate, extraParams });

  useEffect(() => {
    latestRef.current = { searchText, navigate, extraParams };
  }, [searchText, navigate, extraParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const {
        searchText: currentSearchText,
        navigate: currentNavigate,
        extraParams: currentExtraParams,
      } = latestRef.current;

      if (localSearch !== currentSearchText) {
        void currentNavigate({
          // SAFETY: search updater merges dynamic query params into route search state.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- TanStack Router navigate accepts route-specific search function union
          search: ((
            prev: Record<string, string | number | boolean | undefined>,
          ) => ({
            ...prev,
            search: localSearch === '' ? undefined : localSearch,
            page: 1,
            ...currentExtraParams,
          })) as never,
          replace: true,
        });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [localSearch, delay]);
}
