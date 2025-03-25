// sdk/src/trpc.ts
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { initTRPC } from '@trpc/server';
import type { AppRouter } from './types/dist-types/trpc/trpc';

export interface Context {
  apiKey: string;
}

const t = initTRPC.context<Context>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
export const trpc = t;

export function createFrenglishClient(apiUrl: string, apiKey: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${apiUrl}/trpc`,
        headers: () => ({
          Authorization: `Bearer ${apiKey}`,
        }),
      }),
    ],
  });
}
