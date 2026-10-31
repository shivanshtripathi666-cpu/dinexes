"use client";
import { orderBy } from "firebase/firestore";
import { KeyRound, Pencil, Trash2, UserPlus, Users, Wand2 } from "lucide-react";
import { useState } from "react";
import { useDash } from "@/components/dash-context";
import { NoAccess } from "@/components/dash-shell";
import { Modal } from "@/components/modal";
import { PasswordHint, PasswordInput, passwordProblem, randomPassword } from "@/components/password-input";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, PageHeader, Spinner, cx } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { MAX_STAFF } from "@/lib/config";
import { useLiveCollection } from "@/lib/firebase/hooks";
import { mapMember } from "@/lib/mappers";
import { ROLE_LABEL, STAFF_ROLES, can, type Role } from "@/lib/roles";
import type { Member } from "@/lib/types";
import { formatDate } from "@/lib/time";

const ROLE_HELP: Record<Role, string> = {
  owner: "Everything, including staff and billing.",
  manager: "Orders, kitchen, counter, menu, seats & QR, reports.",
  cashier: "Orders and payments at the counter. Hears new orders.",
  kitchen: "Kitchen screen with voice. Accepts and prepares orders, marks dishes sold out.",
  waiter: "Sees all orders and new-order alerts, marks food as served.",
};

type StaffRole = Exclude<Role, "owner">;

export default function StaffPage() {
  const d = useDash();
  if (!can(d.role, "staff.manage")) return <NoAccess />;
  return <Staff />;
}

function DutyPicker({ value, onChange }: { value: StaffRole; onChange: (r: StaffRole) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Duty">
      {STAFF_ROLES.map((r) => (
        <button
          key={r}
          type="button"
          role="radio"
          aria-checked={value === r}
          onClick={() => onChange(r)}
          className={cx("tap rounded-xl border p-3 text-left", value === r ? "border-ink bg-ink text-ivory" : "border-line bg-white")}
        >
          <p className="text-sm font-semibold">{ROLE_LABEL[r]}</p>
          <p className={cx("mt-0.5 text-xs", value === r ? "text-ivory/70" : "text-muted")}>{ROLE_HELP[r]}</p>
        </button>
      ))}
    </div>
  );
}

function Staff() {
  const d = useDash();
  const members = useLiveCollection(`restaurants/${d.rid}/members`, [orderBy("createdAt")], "createdAt", mapMember);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "kitchen" as StaffRole, duty: "", password: "" });
  const [pwFor, setPwFor] = useState<Member | null>(null);
  const [newPw, setNewPw] = useState("");
  const [editFor, setEditFor] = useState<(Member & { role: StaffRole }) | null>(null);
  const [removeFor, setRemoveFor] = useState<Member | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const used = members.data.length;
  const full = used >= MAX_STAFF;

  async function run(key: string, fn: () => Promise<unknown>, success: string) {
    setBusy(key);
    setError("");
    setDone("");
    try {
      await fn();
      setDone(success);
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy("");
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const p = passwordProblem(form.password);
    if (p) return setError(`Password: ${p}`);
    const ok = await run("add", () => api("/api/staff", { method: "POST", body: form }), `${form.name} is added. They open the website, choose “Staff” on the sign-in page and log in with ${form.email} and the password you set.`);
    if (ok) {
      setForm({ name: "", email: "", role: "kitchen", duty: "", password: "" });
      setAdding(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Staff"
        subtitle={`${used} of ${MAX_STAFF} logins used, including you. Staff do not register; they sign in with the email and password you set here.`}
        actions={
          <Button
            onClick={() => {
              setError("");
              setAdding(true);
            }}
            disabled={full}
            data-testid="add-staff"
          >
            <UserPlus className="size-4" /> Add staff
          </Button>
        }
      />

      <div className="mb-5 flex gap-1.5" aria-label={`${used} of ${MAX_STAFF} logins used`}>
        {Array.from({ length: MAX_STAFF }).map((_, i) => (
          <span key={i} className={cx("h-2 flex-1 rounded-full", i < used ? "bg-navy" : "bg-sand")} />
        ))}
      </div>

      {full && (
        <Alert tone="info" className="mb-4">
          All {MAX_STAFF} logins are in use. Remove someone to add a new person.
        </Alert>
      )}
      {done && <Alert tone="ok" className="mb-4">{done}</Alert>}
      {error && !adding && !pwFor && !editFor && <Alert tone="bad" className="mb-4">{error}</Alert>}

      {members.loading ? (
        <Spinner />
      ) : members.data.length === 0 ? (
        <EmptyState icon={<Users className="size-7" />} title="No staff yet" />
      ) : (
        <div className="space-y-3">
          {members.data.map((m) => (
            <Card key={m.uid} className="p-4" data-testid={`member-${m.email}`}>
              <div className="flex flex-wrap items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-navy text-base font-bold text-ivory">{m.name.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {m.name} {m.uid === d.uid && <span className="text-sm font-normal text-muted">(you)</span>}
                  </p>
                  <p className="truncate text-sm text-muted">{m.email}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone={m.role === "owner" ? "dark" : "amber"}>{ROLE_LABEL[m.role]}</Badge>
                    {m.duty && <span className="text-xs text-muted">{m.duty}</span>}
                    <span className="text-xs text-muted">· added {formatDate(m.createdAt)}</span>
                  </div>
                </div>
              </div>
              {m.role !== "owner" && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  <Button size="sm" variant="outline" onClick={() => setEditFor({ ...m, role: m.role as StaffRole })}>
                    <Pencil className="size-4" /> Change duty
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewPw("");
                      setError("");
                      setPwFor(m);
                    }}
                  >
                    <KeyRound className="size-4" /> Set new password
                  </Button>
                  <Button size="sm" variant="ghost" className="ml-auto text-bad" onClick={() => setRemoveFor(m)}>
                    <Trash2 className="size-4" /> Remove
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add staff">
        <form onSubmit={add} className="space-y-4">
          <Field label="Name" htmlFor="s-name">
            <Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Ramesh" />
          </Field>
          <Field label="Email (Gmail)" htmlFor="s-email">
            <Input id="s-email" type="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="ramesh@gmail.com" />
          </Field>
          <div>
            <p className="mb-2 text-sm font-semibold">Duty</p>
            <DutyPicker value={form.role} onChange={(role) => setForm({ ...form, role })} />
          </div>
          <Field label="Duty title (optional)" htmlFor="s-duty" hint="Shown next to their name, e.g. “Head chef”, “Evening cashier”.">
            <Input id="s-duty" value={form.duty} onChange={(e) => setForm({ ...form, duty: e.target.value })} maxLength={40} />
          </Field>
          <Field label="Password for this person" htmlFor="s-pass">
            <PasswordInput id="s-pass" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PasswordHint value={form.password} />
            <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, password: randomPassword() })}>
              <Wand2 className="size-4" /> Make one for me
            </Button>
          </div>
          <p className="text-xs text-muted">Share the email and password with the person privately. You can set a new password for them any time.</p>
          {error && <Alert tone="bad">{error}</Alert>}
          <Button type="submit" size="lg" className="w-full" loading={busy === "add"}>
            Add staff
          </Button>
        </form>
      </Modal>

      <Modal open={!!pwFor} onClose={() => setPwFor(null)} title={`New password for ${pwFor?.name || ""}`}>
        {pwFor && (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const p = passwordProblem(newPw);
              if (p) return setError(`Password: ${p}`);
              const pw = newPw;
              if (await run("pw", () => api("/api/staff", { method: "PATCH", body: { uid: pwFor.uid, password: pw } }), `New password set for ${pwFor.name}: ${pw}. They are signed out on other devices and log in again with it.`)) setPwFor(null);
            }}
          >
            <p className="text-sm text-muted">For safety, current passwords cannot be shown to anyone. Set a new one and tell {pwFor.name}.</p>
            <Field label="New password" htmlFor="np">
              <PasswordInput id="np" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <PasswordHint value={newPw} />
              <Button type="button" size="sm" variant="ghost" onClick={() => setNewPw(randomPassword())}>
                <Wand2 className="size-4" /> Make one for me
              </Button>
            </div>
            {error && <Alert tone="bad">{error}</Alert>}
            <Button type="submit" loading={busy === "pw"}>
              Save new password
            </Button>
          </form>
        )}
      </Modal>

      <Modal open={!!editFor} onClose={() => setEditFor(null)} title={`Duty of ${editFor?.name || ""}`}>
        {editFor && (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run("edit", () => api("/api/staff", { method: "PATCH", body: { uid: editFor.uid, role: editFor.role, duty: editFor.duty } }), `${editFor.name}'s duty is updated.`)) setEditFor(null);
            }}
          >
            <DutyPicker value={editFor.role} onChange={(role) => setEditFor({ ...editFor, role })} />
            <Field label="Duty title (optional)" htmlFor="e-duty">
              <Input id="e-duty" value={editFor.duty} onChange={(e) => setEditFor({ ...editFor, duty: e.target.value })} maxLength={40} />
            </Field>
            {error && <Alert tone="bad">{error}</Alert>}
            <Button type="submit" loading={busy === "edit"}>
              Save
            </Button>
          </form>
        )}
      </Modal>

      <Modal open={!!removeFor} onClose={() => setRemoveFor(null)} title={`Remove ${removeFor?.name || ""}?`}>
        {removeFor && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {removeFor.email} will be signed out and can never log in again with this login. You can add someone else in their place.
            </p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                loading={busy === "rm"}
                onClick={async () => {
                  const m = removeFor;
                  await run("rm", () => api("/api/staff", { method: "DELETE", body: { uid: m.uid } }), `${m.name} has been removed.`);
                  setRemoveFor(null);
                }}
              >
                Remove access
              </Button>
              <Button variant="outline" onClick={() => setRemoveFor(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
