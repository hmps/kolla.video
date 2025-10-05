import { router } from "../trpc";
import { authRouter } from "./auth";
import { clipsRouter } from "./clips";
import { commentsRouter } from "./comments";
import { eventsRouter } from "./events";
import { playersRouter } from "./players";
import { sharesRouter } from "./shares";
import { teamsRouter } from "./teams";

export const appRouter = router({
  auth: authRouter,
  teams: teamsRouter,
  events: eventsRouter,
  players: playersRouter,
  clips: clipsRouter,
  comments: commentsRouter,
  shares: sharesRouter,
});

export type AppRouter = typeof appRouter;
