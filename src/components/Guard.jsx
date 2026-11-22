import { Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';

/**
 * Wraps a lazy-loaded screen: a spinner while its code loads, and a small
 * "Something went wrong" card (with Close) if it crashes.
 */
export default function Guard({ onClose, children, silent = false }) {
  return (
    <ErrorBoundary inline onClose={onClose}>
      <Suspense
        fallback={silent ? null : (
          <div className="cf-lazy-fallback" role="status" aria-label="Loading">
            <LoaderCircle className="cf-spin" size={26} />
          </div>
        )}
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
