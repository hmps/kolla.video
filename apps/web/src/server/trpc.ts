import { initTRPC } from "@trpc/server";
import { cache } from "react";
import "server-only";

export const createContext = cache(async () => {
  return {};
});

const t = initTRPC.context<typeof createContext>().create();

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;
export const publicProcedure = t.procedure;
