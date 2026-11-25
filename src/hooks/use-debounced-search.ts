import type { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export function useDebouncedSearch(
	initialValue: string,
	delay = 300
): [string, string, React.Dispatch<React.SetStateAction<string>>] {
	const [inputValue, setInputValue] = useState(initialValue);
	const [debouncedValue, setDebouncedValue] = useState(initialValue);

	useEffect(() => {
		setInputValue(initialValue);
		setDebouncedValue(initialValue);
	}, [initialValue]);

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
	delay = 300
) {
	const latestRef = useRef({ searchText, navigate, extraParams });
	latestRef.current = { searchText, navigate, extraParams };

	useEffect(() => {
		const timer = setTimeout(() => {
			const {
				searchText: currentSearchText,
				navigate: currentNavigate,
				extraParams: currentExtraParams
			} = latestRef.current;

			if (localSearch !== currentSearchText) {
				currentNavigate({
					search: ((prev: Record<string, unknown>) => ({
						...prev,
						search: localSearch || undefined,
						page: 1,
						...currentExtraParams
					})) as never,
					replace: true
				});
			}
		}, delay);

		return () => clearTimeout(timer);
	}, [localSearch, delay]);
}
