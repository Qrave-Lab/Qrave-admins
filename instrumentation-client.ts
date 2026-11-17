import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./lib/sentry-scrub";

// Inert unless NEXT_PUBLIC_SENTRY_DSN is set. No tracing or replay integrations.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
    // Strictest data collection: no user info, cookies, headers, bodies or query strings.
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, databaseQueryData: false, queues: false, stackFrameVariables: false },
    tracesSampleRate: 0,
    initialScope: { tags: { service: "qrave-admins-browser" } },
    beforeSend: (event) => scrubEvent(event),
  });
}

export const onRouterTransitionStart = dsn ? Sentry.captureRouterTransitionStart : () => {};
