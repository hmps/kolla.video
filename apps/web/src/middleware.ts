import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicPatterns = [
  /^\/$/,
  /^\/sign-in/,
  /^\/sign-up/,
  /^\/forgot-password/,
  /^\/reset-password/,
  /^\/share\//,
  /^\/upload\//,
  /^\/api\/auth\//,
  /^\/api\/trpc\/uploadLinks/,
  /^\/api\/trpc\/shares/,
  /^\/api\/trpc\/playlists\.getViaToken/,
];

function isPublicRoute(pathname: string): boolean {
  return publicPatterns.some((pattern) => pattern.test(pathname));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie (optimistic check)
  // Note: This only checks cookie existence, not validity
  // Actual validation happens in page/API handlers via Better Auth
  // On HTTPS, Better Auth prefixes cookies with __Secure-
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie) {
    // Redirect to sign-in page
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
