import * as React from 'react';

const isRefCallback = <T>(
  ref: React.RefCallback<T> | React.RefObject<T | null>,
): ref is React.RefCallback<T> => typeof ref === 'function';

export function composeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node: T) => {
    for (const ref of refs) {
      if (ref === undefined || ref === null) {
        continue;
      }

      if (isRefCallback(ref)) {
        ref(node);
      } else {
        ref.current = node;
      }
    }
  };
}

export function useComposedRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return React.useCallback(
    (node: T) => {
      composeRefs(...refs)(node);
    },
    [refs],
  );
}

export function composeEventHandlers<
  TEvent extends { defaultPrevented?: boolean },
>(
  originalEventHandler?: (event: TEvent) => void,
  ourEventHandler?: (event: TEvent) => void,
  { checkForDefaultPrevented = true } = {},
) {
  return function handleEvent(event: TEvent) {
    originalEventHandler?.(event);

    if (!checkForDefaultPrevented || event.defaultPrevented !== true) {
      ourEventHandler?.(event);
    }
  };
}
