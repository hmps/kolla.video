import { router } from "../trpc";
import { authRouter } from "./auth";
import { clipsRouter } from "./clips";
import { commentsRouter } from "./comments";
import { dashboardRouter } from "./dashboard";
import { eventsRouter } from "./events";
import { onboardingRouter } from "./onboarding";
import { playersRouter } from "./players";
import { playlistsRouter } from "./playlists";
import { segmentsRouter } from "./segments";
import { sharesRouter } from "./shares";
import { teamsRouter } from "./teams";
import { uploadLinksRouter } from "./uploadLinks";

export const appRouter = router({
  auth: authRouter,
  teams: teamsRouter,
  events: eventsRouter,
  players: playersRouter,
  clips: clipsRouter,
  segments: segmentsRouter,
  comments: commentsRouter,
  shares: sharesRouter,
  playlists: playlistsRouter,
  dashboard: dashboardRouter,
  onboarding: onboardingRouter,
  uploadLinks: uploadLinksRouter,
});

export type AppRouter = typeof appRouter;
