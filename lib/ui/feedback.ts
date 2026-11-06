/**
 * Imperative feedback API (toasts + confirm dialogs) backed by <FeedbackHost />.
 * Replaces window.alert / window.confirm so feedback is non-blocking and styled.
 */
export type ToastKind = "success" | "error" | "info";

export type ToastItem = { id: number; kind: ToastKind; message: string };

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type Listener = {
  toast?: (t: ToastItem) => void;
  confirm?: (o: ConfirmOptions, resolve: (v: boolean) => void) => void;
};

const listener: Listener = {};
let nextId = 1;

export function registerFeedbackHost(l: Listener) {
  listener.toast = l.toast;
  listener.confirm = l.confirm;
  return () => {
    if (listener.toast === l.toast) listener.toast = undefined;
    if (listener.confirm === l.confirm) listener.confirm = undefined;
  };
}

function push(kind: ToastKind, message: unknown) {
  const text = typeof message === "string" && message.trim() ? message : "Something went wrong. Please try again.";
  listener.toast?.({ id: nextId++, kind, message: text });
}

export const notify = {
  success: (m: unknown) => push("success", m),
  error: (m: unknown) => push("error", m),
  info: (m: unknown) => push("info", m),
};

export function confirmAction(options: ConfirmOptions | string): Promise<boolean> {
  const o = typeof options === "string" ? { message: options } : options;
  return new Promise((resolve) => {
    if (!listener.confirm) return resolve(false);
    listener.confirm(o, resolve);
  });
}
