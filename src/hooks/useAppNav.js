import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PATHS } from '../lib/routes';

/**
 * Navigation helpers.
 *  - go(path): open a screen (adds a history entry, so Back returns here)
 *  - close(fallback): leave the current screen. Uses real history when the user
 *    arrived from inside the app, and goes to `fallback` when the page was opened
 *    directly (a shared link, a refresh) so Back never leaves the site by surprise.
 */
export function useAppNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const go = useCallback((to, options) => navigate(to, options), [navigate]);

  const close = useCallback((fallback = PATHS.home) => {
    const hasInAppHistory = (window.history.state?.idx ?? 0) > 0;
    if (hasInAppHistory) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate]);

  return { go, close, location };
}
