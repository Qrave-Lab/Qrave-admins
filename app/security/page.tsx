"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Check, Copy, Download, KeyRound, LogOut, ShieldCheck, Smartphone } from "lucide-react";

type Status = {
  enabled: boolean;
  bootstrap: boolean;
  recoveryCodesLeft: number;
  required: boolean;
  setup_pending: boolean;
  username: string;
};

type Setup = { secret: string; otpauth_url: string; qr_svg: string; bootstrap: boolean };

const input =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 tracking-widest";
const primary =
  "w-full py-3 px-5 rounded-xl font-semibold text-sm text-white bg-[#FF5500] hover:bg-[#E64D00] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2";
const secondary =
  "py-2.5 px-4 rounded-xl font-medium text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 transition-colors flex items-center justify-center gap-2";

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data as T;
}

function ErrorNote({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
      <AlertCircle size={15} className="shrink-0 mt-0.5" />
      <span className="leading-snug font-medium">{text}</span>
    </div>
  );
}

function RecoveryCodes({ codes, onDone, doneLabel }: { codes: string[]; onDone: () => void; doneLabel: string }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const text = `Qrave Admin recovery codes\nEach code works once.\n\n${codes.join("\n")}\n`;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Save your recovery codes</h2>
        <p className="text-sm text-slate-600 mt-1">
          If you lose your phone, sign in with one of these instead of a code. Each works once. They won&apos;t be shown again.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2 p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-sm text-slate-900">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button
          type="button"
          className={`${secondary} flex-1`}
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setSaved(true);
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          className={`${secondary} flex-1`}
          onClick={() => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
            a.download = "qrave-admin-recovery-codes.txt";
            a.click();
            URL.revokeObjectURL(a.href);
            setSaved(true);
          }}
        >
          <Download size={16} /> Download
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="accent-[#FF5500]" />
        I&apos;ve saved these codes somewhere safe
      </label>
      <button type="button" className={primary} disabled={!saved} onClick={onDone}>
        {doneLabel}
      </button>
    </div>
  );
}

function CodeForm({
  label,
  button,
  danger,
  allowRecovery,
  onSubmit,
  onCancel,
}: {
  label: string;
  button: string;
  danger?: boolean;
  allowRecovery?: boolean;
  onSubmit: (code: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(code);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="code" className="text-xs font-semibold text-slate-700">
        {label}
      </label>
      <input
        id="code"
        className={input}
        inputMode={allowRecovery ? "text" : "numeric"}
        autoComplete="one-time-code"
        placeholder={allowRecovery ? "123456 or recovery code" : "123456"}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={allowRecovery ? 16 : 6}
        required
        autoFocus
      />
      <ErrorNote text={error} />
      <div className="flex gap-2">
        {onCancel && (
          <button type="button" className={`${secondary} flex-1`} onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className={danger ? `${secondary} flex-1 !text-red-700 !border-red-200 hover:!bg-red-50` : `${primary} flex-1`}
        >
          {busy ? "Checking…" : button}
        </button>
      </div>
    </form>
  );
}

export default function SecurityPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [setupError, setSetupError] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [action, setAction] = useState<"none" | "regen" | "disable">("none");
  const [copiedSecret, setCopiedSecret] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/2fa/status", { credentials: "include", cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) throw new Error("Could not load your 2FA settings.");
      setStatus(await res.json());
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const startSetup = async () => {
    setSetupError("");
    try {
      setSetup(await post<Setup>("/api/auth/2fa/setup"));
    } catch (err) {
      setSetupError((err as Error).message);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
  };

  let content: React.ReactNode;

  if (loadError) {
    content = <ErrorNote text={loadError} />;
  } else if (!status) {
    content = <div className="h-40 flex items-center justify-center text-sm text-slate-500">Loading…</div>;
  } else if (codes) {
    content = (
      <RecoveryCodes
        codes={codes}
        doneLabel={status.setup_pending ? "Continue to dashboard" : "Done"}
        onDone={() => {
          setCodes(null);
          setAction("none");
          if (status.setup_pending) router.push("/dashboard");
          else void load();
        }}
      />
    );
  } else if (status.enabled) {
    content = (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <ShieldCheck size={20} className="text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-900">
            <p className="font-semibold">Two-step sign-in is on</p>
            <p className="mt-0.5">
              {status.bootstrap
                ? "This env account's authenticator secret is set in SUPERADMIN_USERS_JSON."
                : `${status.recoveryCodesLeft} of 8 recovery codes left.`}
            </p>
          </div>
        </div>
        {!status.bootstrap && action === "none" && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="button" className={`${secondary} flex-1`} onClick={() => setAction("regen")}>
              <KeyRound size={16} /> New recovery codes
            </button>
            <button type="button" className={`${secondary} flex-1`} onClick={() => setAction("disable")}>
              <Smartphone size={16} /> {status.required ? "Move to a new phone" : "Turn off"}
            </button>
          </div>
        )}
        {action === "regen" && (
          <CodeForm
            label="Enter a code from your app to replace all recovery codes"
            button="Make new codes"
            onCancel={() => setAction("none")}
            onSubmit={async (code) => {
              const res = await post<{ recovery_codes: string[] }>("/api/auth/2fa/recovery-codes", { code });
              setCodes(res.recovery_codes);
            }}
          />
        )}
        {action === "disable" && (
          <CodeForm
            label={
              status.required
                ? "Enter a code (or recovery code) to remove this phone. You'll set up the new one straight after."
                : "Enter a code (or recovery code) to turn off two-step sign-in"
            }
            button={status.required ? "Remove this phone" : "Turn off"}
            danger
            allowRecovery
            onCancel={() => setAction("none")}
            onSubmit={async (code) => {
              await post("/api/auth/2fa/disable", { code });
              setAction("none");
              setSetup(null);
              await load();
            }}
          />
        )}
      </div>
    );
  } else if (!setup) {
    content = (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">
          {status.required
            ? "Two-step sign-in is required for admin accounts. Set it up to continue."
            : "Add a second step to sign-in: a 6-digit code from an authenticator app on your phone."}
        </p>
        <ol className="text-sm text-slate-700 list-decimal pl-5 space-y-1">
          <li>Install an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Authy).</li>
          <li>Scan the QR code on the next screen.</li>
          <li>Enter the 6-digit code it shows.</li>
        </ol>
        <ErrorNote text={setupError} />
        <button type="button" className={primary} onClick={startSetup}>
          Set up two-step sign-in
        </button>
      </div>
    );
  } else {
    const jsonSnippet = `"totp_secret": "${setup.secret}"`;
    content = (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row gap-5 items-center">
          <div
            className="w-[200px] h-[200px] shrink-0 rounded-xl border border-slate-200 bg-white p-2 [&_svg]:w-full [&_svg]:h-full"
            aria-label="QR code to scan with your authenticator app"
            role="img"
            dangerouslySetInnerHTML={{ __html: setup.qr_svg }}
          />
          <div className="text-sm text-slate-600 flex flex-col gap-2 min-w-0">
            <p>Scan this with your authenticator app. Can&apos;t scan? Enter this key instead:</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 break-all">
                {setup.secret.match(/.{1,4}/g)?.join(" ")}
              </code>
              <button
                type="button"
                aria-label="Copy key"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                onClick={async () => {
                  await navigator.clipboard.writeText(setup.secret);
                  setCopiedSecret(true);
                }}
              >
                {copiedSecret ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
        {setup.bootstrap ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 flex flex-col gap-2">
            <p className="font-semibold">This account comes from SUPERADMIN_USERS_JSON.</p>
            <p>
              After scanning, add this to your entry in that env variable and redeploy. Sign-in will then ask for a code:
            </p>
            <code className="font-mono text-xs bg-white border border-amber-200 rounded-lg px-2 py-1.5 break-all">{jsonSnippet}</code>
          </div>
        ) : (
          <CodeForm
            label="Enter the 6-digit code from your app"
            button="Turn on"
            onCancel={() => setSetup(null)}
            onSubmit={async (code) => {
              const res = await post<{ recovery_codes: string[] }>("/api/auth/2fa/confirm", { code });
              setCodes(res.recovery_codes);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="w-full max-w-[560px]">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-6 sm:p-10 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Two-step sign-in</h1>
              {status && <p className="text-sm text-slate-500 mt-1">{status.username}</p>}
            </div>
            {status?.setup_pending ? (
              <button type="button" onClick={logout} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1.5">
                <LogOut size={15} /> Log out
              </button>
            ) : (
              <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1.5">
                <ArrowLeft size={15} /> Dashboard
              </Link>
            )}
          </div>
          {content}
        </div>
      </div>
    </main>
  );
}
