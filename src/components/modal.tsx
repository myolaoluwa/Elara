"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Native modal semantics provide focus containment and focus restoration. */
export function Modal({ children, labelledBy, onClose, busy = false }: { children: ReactNode; labelledBy: string; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, select, button')?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return <dialog ref={ref} className="modal-layer" aria-labelledby={labelledBy} aria-busy={busy} onKeyDown={(event) => {
    if (event.key !== "Tab") return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), a[href]')].filter((element) => element.offsetParent !== null);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>{children}</dialog>;
}
