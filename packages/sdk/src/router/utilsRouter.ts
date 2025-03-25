import { parsePartialConfig } from '@/utils/utils';
import { publicProcedure, router } from '../trpc';
import { z } from 'zod';

export const utilsRouter = router({
  parsePartialConfig: publicProcedure
    .input(z.any())
    .query(({ input }) => {
      return parsePartialConfig(input);
    }),
});
