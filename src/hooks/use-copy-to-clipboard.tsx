import * as React from 'react';

export interface UseCopyToClipboardProps {
  timeout?: number;
}

export function useCopyToClipboard({
  timeout = 2000,
}: UseCopyToClipboardProps = {}) {
  const [isCopied, setIsCopied] = React.useState<boolean>(false);

  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const copyToClipboard = React.useCallback(
    async (value: string): Promise<boolean> => {
      if (!value) {
        return false;
      }

      // oxlint-disable-next-line typescript/no-unnecessary-condition -- Non-secure HTTP origins can omit navigator.clipboard at runtime
      if (globalThis.navigator.clipboard === undefined) {
        return false;
      }

      try {
        await globalThis.navigator.clipboard.writeText(value);
      } catch {
        // NotAllowedError when the document isn't focused, or the
        // Permission prompt is denied. Treat as failure, not a crash.
        return false;
      }

      setIsCopied(true);

      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setIsCopied(false);
        timeoutRef.current = null;
      }, timeout);

      return true;
    },
    [timeout],
  );

  return { copyToClipboard, isCopied };
}
