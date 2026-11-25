import React from 'react';

import { useCallbackRef } from './use-callback-ref';

/**
 * @see https://github.com/radix-ui/primitives/blob/main/packages/react/use-controllable-state/src/useControllableState.tsx
 */

interface UseControllableStateParams<T> {
  prop?: T | undefined;
  defaultProp?: T | undefined;
  onChange?: (state: T) => void;
}

type SetStateFn<T> = (prevState: T | undefined) => T | undefined;

const isUpdaterFn = <T,>(
  value: React.SetStateAction<T | undefined>,
): value is SetStateFn<T> => typeof value === 'function';

const useUncontrolledState = <T,>({
  defaultProp,
  onChange,
}: {
  defaultProp?: T | undefined;
  onChange?: ((state: T) => void) | undefined;
}) => {
  const [value, setValue] = React.useState<T | undefined>(defaultProp);
  const prevValueRef = React.useRef(value);
  const handleChange = useCallbackRef(onChange);

  React.useEffect(() => {
    if (prevValueRef.current !== value) {
      if (value !== undefined) {
        handleChange(value);
      }

      prevValueRef.current = value;
    }
  }, [value, handleChange]);

  return [value, setValue] as const;
};

const useControllableState = <T,>({
  prop,
  defaultProp,
  onChange,
}: UseControllableStateParams<T>) => {
  const [uncontrolledProp, setUncontrolledProp] = useUncontrolledState({
    defaultProp,
    onChange,
  });

  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolledProp;
  const handleChange = useCallbackRef(onChange);

  const setValue: React.Dispatch<React.SetStateAction<T | undefined>> =
    React.useCallback(
      (nextValue) => {
        if (isControlled) {
          const resolvedValue = isUpdaterFn(nextValue)
            ? nextValue(prop)
            : nextValue;

          if (resolvedValue !== prop && resolvedValue !== undefined) {
            handleChange(resolvedValue);
          }
        } else {
          setUncontrolledProp(nextValue);
        }
      },
      [isControlled, prop, setUncontrolledProp, handleChange],
    );

  return [value, setValue] as const;
};

export { useControllableState };
