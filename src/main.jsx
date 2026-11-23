import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './tokens.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './styles.css';
import { initMonitoring, reportError } from './lib/monitoring';
import './desktop.css'; // last, so its desktop rules win over the phone styles

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);


// After the first screen is up, so monitoring never delays it.
if ('requestIdleCallback' in window) requestIdleCallback(() => initMonitoring());
else setTimeout(initMonitoring, 2000);

// Visit /?sentry_test=1 once after deploying to confirm reports reach Sentry.
if (new URLSearchParams(window.location.search).has('sentry_test')) {
  reportError(new Error('CampusFlip Sentry test (safe to ignore)'));
}
