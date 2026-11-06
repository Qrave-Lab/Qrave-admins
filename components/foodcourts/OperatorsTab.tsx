"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Plus, Trash2, Users } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, Empty, Field, Modal, errorText, inputClass, useToast } from "./ui";
import type { TabProps } from "./types";
import { dinerBaseUrl, foodCourts, formatIST, generatePassword, type Operator } from "@/lib/foodCourts";

const ROLE_HELP = {
  owner: "Can see analytics, edit stall labels, hide stalls and schedule ads.",
  manager: "Can see everything but can't change anything.",
};

export default function OperatorsTab({ detail, reload, canManage }: TabProps) {
  const toast = useToast();
  const { court, operators } = detail;
  const loginUrl = `${dinerBaseUrl()}/fc-admin/login`;
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Operator | null>(null);
  const [resetting, setResetting] = useState<Operator | null>(null);
  const [handover, setHandover] = useState<{ email: string; password: string } | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-600">
          Operators are the food court&apos;s management team. They sign in at{" "}
          <a href={loginUrl} target="_blank" rel="noreferrer" className="font-semibold text-slate-900 underline">
            {loginUrl.replace(/^https?:\/\//, "")}
          </a>{" "}
          to see analytics and run the court. Stall owners don&apos;t need operator accounts.
        </p>
        {canManage && (
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} /> Add operator
          </Button>
        )}
      </div>

      <Card>
        {operators.length === 0 ? (
          <Empty icon={<Users size={32} />} title="No operators yet">
            {canManage ? "Add someone from the food court's management so they can see analytics and run ads." : null}
          </Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {operators.map((o) => (
              <li key={o.userId} className="flex flex-wrap items-center gap-3 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold uppercase text-white">
                  {(o.name || o.email).slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">{o.name || o.email}</p>
                    <Badge className={o.role === "owner" ? "border-purple-200 bg-purple-50 text-purple-700" : "border-slate-200 bg-slate-100 text-slate-700"}>
                      {o.role === "owner" ? "Owner" : "Manager"}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-slate-500">
                    {o.name ? `${o.email} · ` : ""}added {formatIST(o.createdAt)}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button variant="outline" onClick={() => setResetting(o)}>
                      <KeyRound size={14} /> Reset password
                    </Button>
                    <Button variant="ghost" onClick={() => setRemoving(o)} aria-label={`Remove ${o.email}`} className="text-red-600 hover:bg-red-50">
                      <Trash2 size={15} />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {adding && (
        <AddOperatorModal
          courtID={court.id}
          existing={operators.map((o) => o.email.toLowerCase())}
          onClose={() => setAdding(false)}
          onAdded={async (email, password, created) => {
            await reload();
            if (created && password) setHandover({ email, password });
            else toast("ok", `${email} can now sign in with their existing Qrave password`);
          }}
        />
      )}
      {resetting && (
        <ConfirmDialog
          title="Reset password"
          confirmLabel="Reset password"
          message={
            <>
              Make a new password for <strong>{resetting.email}</strong>? Their current password stops working. You&apos;ll see the new one once, to send them.
              {" "}If this email also signs in to a restaurant on Qrave, that password changes too.
            </>
          }
          onClose={() => setResetting(null)}
          onConfirm={async () => {
            const password = generatePassword();
            await foodCourts.resetPassword(court.id, resetting.userId, password);
            setHandover({ email: resetting.email, password });
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Remove operator"
          danger
          confirmLabel="Remove access"
          message={
            <>
              Remove <strong>{removing.email}</strong> from {court.name}? They&apos;re signed out on their next action. Their Qrave account itself isn&apos;t deleted.
            </>
          }
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await foodCourts.removeOperator(court.id, removing.userId);
            await reload();
            toast("ok", `${removing.email} removed`);
          }}
        />
      )}
      {handover && <PasswordHandover {...handover} loginUrl={loginUrl} onClose={() => setHandover(null)} />}
    </div>
  );
}

function AddOperatorModal({
  courtID,
  existing,
  onClose,
  onAdded,
}: {
  courtID: string;
  existing: string[];
  onClose: () => void;
  onAdded: (email: string, password: string, created: boolean) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"owner" | "manager">("owner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const clean = email.trim().toLowerCase();
  const emailError = clean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) ? "Enter a valid email" : existing.includes(clean) ? "Already an operator here" : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clean || emailError) return;
    setBusy(true);
    setError("");
    const password = generatePassword();
    try {
      const res = await foodCourts.addOperator(courtID, { email: clean, name: name.trim() || undefined, password, role });
      await onAdded(clean, password, res.created);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <Modal title="Add operator" onClose={() => !busy && onClose()}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" error={emailError}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoFocus required />
        </Field>
        <Field label="Name" hint="Optional">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} maxLength={80} />
        </Field>
        <Field label="Role" hint={ROLE_HELP[role]}>
          <select value={role} onChange={(e) => setRole(e.target.value as "owner" | "manager")} className={inputClass}>
            <option value="owner">Owner</option>
            <option value="manager">Manager (view only)</option>
          </select>
        </Field>
        <p className="text-xs text-slate-500">
          New emails get an account with a generated password, shown to you once. If the email already has a Qrave account, it&apos;s linked and keeps its password.
        </p>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" busy={busy} disabled={!clean || Boolean(emailError)}>
            Add operator
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordHandover({ email, password, loginUrl, onClose }: { email: string; password: string; loginUrl: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const message = `Your Qrave food court sign-in\n${loginUrl}\nEmail: ${email}\nPassword: ${password}\n\nPlease change the password after signing in.`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked; the text is selectable below
    }
  };
  return (
    <Modal title="Send these sign-in details" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">This password is shown only now. Send it to the operator privately.</p>
        <pre className="select-all whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[13px] text-slate-800">{message}</pre>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={copy}>
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
          </Button>
          <Button onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
