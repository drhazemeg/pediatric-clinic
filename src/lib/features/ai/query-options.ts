import { mutationOptions } from '@tanstack/react-query';

import { enqueueAiJobFn } from '@/server/functions/ai.functions';

export const aiMutationOptions = {
  execute: () =>
    mutationOptions({
      mutationKey: ['ai', 'execute'] as const,
      mutationFn: async (input: Parameters<typeof enqueueAiJobFn>[0]['data']) =>
        await enqueueAiJobFn({ data: input }),
    }),
};
