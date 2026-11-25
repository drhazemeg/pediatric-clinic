// src/components/providers/clinical-store-provider.tsx

import type { ReactNode } from 'react';

import { useEffect } from 'react';

import { initializeClinicalStore } from './clinical-store';

export function ClinicalStoreProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  useEffect(() => {
    initializeClinicalStore();
  }, []);

  return children;
}
