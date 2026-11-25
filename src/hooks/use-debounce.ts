import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

export function useDebounce<T>(
	value: T,
	delay?: number
): readonly [T, T, Dispatch<SetStateAction<T>>] {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);
	const [initial, setInitial] = useState<T>(value);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value);
		}, delay || 500);

		return () => {
			clearTimeout(timer);
		};
	}, [value, delay]);

	return [debouncedValue, initial, setInitial] as const;
}
