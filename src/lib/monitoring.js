// Error monitoring (Sentry). Loaded lazily so it never slows the first screen.
// The DSN is a public key (it only lets events be sent in), so it is safe in the browser.
// Override with VITE_SENTRY_DSN, or set it empty to switch monitoring off.
const DSN = import.meta.env.VITE_SENTRY_DSN ?? 'https://295a10efb2292b3191a4055bc31b51ad@o4512481167081472.ingest.us.sentry.io/4512481180581889';

// Harmless browser noise that would only burn the free quota.
const IGNORE = [
  /ResizeObserver loop/i,
  /Non-Error promise rejection captured/i,
  /Failed to fetch/i,
  /NetworkError when attempting to fetch/i,
  /Load failed/i,
  /AbortError/i,
  /The operation was aborted/i,
];

let sentry = null;
let loading = null;

function enabled() {
  return Boolean(DSN) && import.meta.env.PROD &&
    !['localhost', '127.0.0.1'].includes(window.location.hostname);
}

function scrub(value) {
  return typeof value === 'string'
    ? value.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    : value;
}

export function initMonitoring() {
  if (!enabled() || loading) return loading;
  loading = import('@sentry/react').then(Sentry => {
    Sentry.init({
      dsn: DSN,
      environment: window.location.hostname,
      sendDefaultPii: false,
      tracesSampleRate: 0,          // errors only, to stay inside the free quota
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      ignoreErrors: IGNORE,
      beforeSend(event) {
        // Never send email addresses that might appear in an error message.
        if (event.message) event.message = scrub(event.message);
        event.exception?.values?.forEach(v => { v.value = scrub(v.value); });
        if (event.request?.url) event.request.url = event.request.url.split('?')[0];
        return event;
      },
    });
    sentry = Sentry;
  }).catch(() => { /* monitoring must never break the app */ });
  return loading;
}

export function reportError(error, context) {
  if (!enabled()) return;
  Promise.resolve(loading || initMonitoring()).then(() => {
    sentry?.captureException(error, context ? { extra: context } : undefined);
  });
}

// Anonymous id only (no name or email), so a report can be matched to one student's session.
export function setMonitoringUser(id) {
  if (!enabled()) return;
  Promise.resolve(loading || initMonitoring()).then(() => sentry?.setUser(id ? { id } : null));
}
