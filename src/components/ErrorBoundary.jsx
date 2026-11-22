import React from 'react';

/**
 * Catches render errors so one broken screen never blanks the whole app.
 * Use `inline` for overlays: it shows a small card with a Close button
 * instead of the full-page fallback.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('CampusFlip render error:', error, info?.componentStack);
    this.props.onError?.(error, info);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const { inline, onClose } = this.props;
    const box = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      textAlign: 'center',
      padding: 24,
      color: '#101C3A',
      background: '#fff',
      font: '600 15px/1.4 Manrope, system-ui, sans-serif',
      ...(inline
        ? { position: 'fixed', inset: 0, zIndex: 9999 }
        : { minHeight: '100vh' }),
    };
    const btn = {
      border: 0,
      borderRadius: 14,
      padding: '12px 20px',
      minHeight: 44,
      font: '700 14px Manrope, system-ui, sans-serif',
      cursor: 'pointer',
      background: '#2563EB',
      color: '#fff',
    };

    return (
      <div role="alert" style={box}>
        <div style={{ fontSize: 40 }} aria-hidden="true">😕</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Something went wrong</div>
        <div style={{ color: '#4B5563', fontWeight: 500, maxWidth: 320 }}>
          This screen hit an unexpected problem. Your data is safe.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {inline ? (
            <button type="button" style={btn} onClick={() => { this.reset(); onClose?.(); }}>
              Close
            </button>
          ) : (
            <button type="button" style={btn} onClick={() => window.location.reload()}>
              Reload CampusFlip
            </button>
          )}
        </div>
      </div>
    );
  }
}
