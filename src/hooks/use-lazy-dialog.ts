import { useCallback, useState } from 'react';

// Open state for a dialog whose code loads on first use. `used` stays true after closing,
// so the dialog stays mounted and its exit animation can run.
export function useLazyDialog() {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);

  const handleOpenChange = useCallback(
    (next: React.SetStateAction<boolean>) => {
      setUsed(true);
      setOpen(next);
    },
    [],
  );

  // Called when the dialog's chunk fails to load, so the shell carries on without it.
  const reset = useCallback(() => {
    setUsed(false);
    setOpen(false);
  }, []);

  return { open, used, setOpen: handleOpenChange, reset };
}
