import { router } from '../trpc';
import { configurationRouter } from './configurationRouter';
import { utilsRouter } from './utilsRouter';

export const appRouter = router({
  configuration: configurationRouter,
  utils: utilsRouter,
});

export type AppRouter = typeof appRouter;
