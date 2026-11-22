import { useEffect, useRef } from 'react';

/**
 * Back-button handling for "pages" that are really overlays.
 *
 * All overlays share ONE stack, so a single Back press closes only the
 * top-most overlay (e.g. a listing opened over Search closes first).
 *
 * - Opening an overlay pushes a history entry.
 * - Back (popstate) closes the top overlay only.
 * - Closing from the UI calls `close()`, which pops our entry with history.back().
 * - If an overlay is closed in code (no Back, no `close()`), its stale
 *   history entry is removed on the next tick so Back never gets stuck.
 *
 *   const { close } = useBackButton(open, () => setOpen(false));
 */
const stack = []; // entries: { id, onBack }
let nextId = 1;
let ignorePops = 0; // popstate events caused by our own history.back() calls
let listening = false;
const afterPop = []; // pushes waiting for one of our own history.back() calls to finish

function flushAfterPop() {
  while (afterPop.length) afterPop.shift()();
}

function onPop() {
  if (ignorePops > 0) {
    ignorePops -= 1;
    if (ignorePops === 0) flushAfterPop();
    return;
  }
  const top = stack[stack.length - 1];
  if (!top) return;
  top.poppedByBrowser = true; // browser already removed the history entry
  top.onBack?.();
}

function ensureListener() {
  if (listening || typeof window === 'undefined') return;
  window.addEventListener('popstate', onPop);
  listening = true;
}

export function useBackButton(active, onBack) {
  const onBackRef = useRef(onBack);
  const entryRef = useRef(null);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!active) return undefined;
    ensureListener();

    const entry = {
      id: nextId++,
      poppedByBrowser: false,
      closedByUi: false,
      onBack: () => onBackRef.current?.(),
    };
    entryRef.current = entry;
    stack.push(entry);

    // If another overlay is mid-close (its history.back() not finished), wait for it
    // so our new entry is not popped by that pending back.
    const push = () => {
      entry.pushed = true;
      window.history.pushState({ cfOverlay: entry.id }, '');
    };
    let waiter = null;
    let fallbackTimer = null;
    if (ignorePops > 0) {
      waiter = () => { clearTimeout(fallbackTimer); push(); };
      afterPop.push(waiter);
      fallbackTimer = setTimeout(() => {
        const i = afterPop.indexOf(waiter);
        if (i !== -1) { afterPop.splice(i, 1); ignorePops = 0; push(); }
      }, 400);
    } else {
      push();
    }

    return () => {
      const index = stack.indexOf(entry);
      if (index !== -1) stack.splice(index, 1);
      entryRef.current = null;
      if (waiter) {
        const i = afterPop.indexOf(waiter);
        if (i !== -1) afterPop.splice(i, 1);
        clearTimeout(fallbackTimer);
      }
      if (!entry.pushed) return; // never reached history, nothing to clean up

      // Closed in code: our pushed entry is still in history. Remove it quietly.
      if (!entry.poppedByBrowser && !entry.closedByUi) {
        // Deferred so React StrictMode's mount/unmount/mount in dev can't pop the wrong entry.
        setTimeout(() => {
          const state = window.history.state;
          if (state && state.cfOverlay === entry.id) {
            ignorePops += 1;
            window.history.back();
          }
        }, 0);
      }
    };
  }, [active]);

  const close = () => {
    const entry = entryRef.current;
    if (entry && entry.pushed && !entry.poppedByBrowser) {
      entry.closedByUi = true;
      // history.back() fires popstate; run the handler for this entry only.
      ignorePops += 1;
      window.history.back();
      onBackRef.current?.();
    } else {
      onBackRef.current?.();
    }
  };

  return { close };
}
