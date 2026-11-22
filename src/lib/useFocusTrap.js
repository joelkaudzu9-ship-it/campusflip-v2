import { useEffect } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keeps keyboard focus inside a dialog while it is open, moves focus into it on
 * open, and gives focus back to the element that opened it on close.
 */
export function useFocusTrap(ref, active = true) {
  useEffect(() => {
    const node = ref.current;
    if (!active || !node) return undefined;

    const previous = document.activeElement;
    const focusables = () => Array.from(node.querySelectorAll(FOCUSABLE))
      .filter(el => el.offsetParent !== null || el === document.activeElement);

    if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
    // Focus the dialog itself (not the first control) so screen readers announce it
    // without scrolling or triggering a keyboard on a text field.
    node.focus({ preventScroll: true });

    function onKeyDown(event) {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }

    node.addEventListener('keydown', onKeyDown);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [ref, active]);
}
