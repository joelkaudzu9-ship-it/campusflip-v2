// Turns raw errors into messages a student on a weak connection can act on.
const NETWORK_RE = /failed to fetch|failed to send a request|networkerror|network request failed|load failed|fetch failed|network error|timed out|timeout|err_internet|connection (?:was )?lost/i;

export function isNetworkError(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const text = `${err?.name || ''} ${err?.message || ''}`;
  return NETWORK_RE.test(text);
}

export const OFFLINE_MESSAGE = 'No internet connection. Check your data and try again.';

/** The message to show for `err`. `fallback` is used when the error has no message of its own. */
export function friendlyError(err, fallback = 'Something went wrong. Please try again.') {
  if (isNetworkError(err)) return OFFLINE_MESSAGE;
  const message = String(err?.message || '').trim();
  return message || fallback;
}

/** Runs `task`, retrying only network failures (not server answers) with a growing pause. */
export async function withRetry(task, { attempts = 3, delayMs = 900 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (err) {
      lastError = err;
      if (!isNetworkError(err) || attempt === attempts) break;
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw lastError;
}
