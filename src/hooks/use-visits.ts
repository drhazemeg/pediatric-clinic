// apps/web/src/hooks/use-visits.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  completeVisitMutationOptions,
  updateVisitMutationOptions,
  visitQueryOptions,
} from '@/lib/features/visits/query-options';
import { getErrorMessage } from '@/lib/web/error-utils';

export function useVisit(id: string | null) {
  return useQuery({
    ...visitQueryOptions.detail(id ?? ''),
    enabled: id !== null && id !== '',
  });
}

export function useUpdateVisit() {
  const qc = useQueryClient();

  return useMutation({
    ...updateVisitMutationOptions(qc),
    onError: (err) =>
      toast.error('Autosave failed', { description: getErrorMessage(err) }),
  });
}

export function useCompleteVisit() {
  const qc = useQueryClient();

  return useMutation({
    ...completeVisitMutationOptions(qc),
    onSuccess: () => {
      toast.success('Visit completed');
    },
    onError: (err) =>
      toast.error('Could not complete visit', {
        description: getErrorMessage(err),
      }),
  });
}
