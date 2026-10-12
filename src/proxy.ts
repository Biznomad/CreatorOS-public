import { NextResponse } from 'next/server';

// Let all routes through — auth is handled client-side via useAuth() redirect
// This avoids SSR blocking when Clerk production keys are not installed on the host.
export default function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
