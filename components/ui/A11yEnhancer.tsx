"use client";

import { useEffect } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const CONTROLS = "input:not([type='hidden']), select, textarea";

let uid = 0;

/** Associate bare <label>s with the next form control in the same container. */
function linkLabels(root: ParentNode) {
  root.querySelectorAll<HTMLLabelElement>("label:not([for])").forEach((label) => {
    if (label.querySelector(CONTROLS)) return; // wrapping label is already associated
    let scope: Element | null = label.parentElement;
    for (let depth = 0; scope && depth < 2; depth++, scope = scope.parentElement) {
      const control = Array.from(scope.querySelectorAll<HTMLElement>(CONTROLS)).find(
        (c) => label.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING
      );
      if (control) {
        if (!control.id) control.id = `field-${++uid}`;
        label.htmlFor = control.id;
        return;
      }
    }
  });
}

function topDialog(): HTMLElement | null {
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]');
  return dialogs.length ? dialogs[dialogs.length - 1] : null;
}

function closeButton(dialog: HTMLElement): HTMLElement | null {
  const explicit = dialog.querySelector<HTMLElement>('[data-dialog-close], [aria-label="Close"]');
  if (explicit) return explicit;
  const byIcon = dialog.querySelector<SVGElement>("svg.lucide-x");
  if (byIcon) return byIcon.closest("button");
  return Array.from(dialog.querySelectorAll<HTMLElement>("button")).find((b) =>
    /^(cancel|close)$/i.test(b.textContent?.trim() ?? "")
  ) ?? null;
}

/**
 * App-wide accessibility behaviours for the many hand-rolled modals:
 * Escape closes the top dialog, Tab is trapped inside it, focus moves in on
 * open and returns to the trigger on close, and bare labels get linked.
 */
export default function A11yEnhancer() {
  useEffect(() => {
    linkLabels(document);
    let lastDialog: HTMLElement | null = null;
    let returnTo: HTMLElement | null = null;

    const observer = new MutationObserver(() => {
      linkLabels(document);
      const dialog = topDialog();
      if (dialog && dialog !== lastDialog) {
        returnTo = (document.activeElement as HTMLElement) ?? null;
        if (!dialog.contains(document.activeElement)) {
          const first = dialog.querySelector<HTMLElement>(
            'input:not([type="hidden"]), select, textarea, button, [href]'
          );
          (first ?? dialog).focus?.({ preventScroll: true });
        }
      } else if (!dialog && lastDialog) {
        returnTo?.isConnected && returnTo.focus?.({ preventScroll: true });
        returnTo = null;
      }
      lastDialog = dialog;
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onKey = (e: KeyboardEvent) => {
      const dialog = topDialog();
      if (!dialog) return;
      if (e.key === "Escape") {
        const btn = closeButton(dialog);
        if (btn) {
          e.preventDefault();
          btn.click();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}
