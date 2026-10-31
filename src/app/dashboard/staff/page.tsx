"use client";
import { orderBy } from "firebase/firestore";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useDash } from "@/components/dash-context";
import { NoAccess } from "@/components/dash-shell";
import { Modal } from "@/components/modal";
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { MAX_STAFF } from "@/lib/config";
import { useLiveCollection } from "@/lib/firebase/hooks";
import { mapMember } from "@/lib/mappers";
import { ROLE_LABEL, STAFF_ROLES, can, type Role } from "@/lib/roles";
import { formatDate } from "@/lib/time";

const ROLE_HELP: Record<Role, string> = {
  owner: "Everything, including staff and billing.",
  manager: "Kitchen and counter, menu, seats and QR codes, reports.",
  cashier: "Counter screen: orders, serving and payments.",
  kitchen: "Kitchen screen with voice, and sold-out switches.",
};

export default function StaffPage() {
  const d = useDash();
  if (!can(d.role, "staff.manage")) return <NoAccess />;
  return <Staff />;
}

function Staff() {
  const d = useDash();
  const members = useLiveCollection(`restaurants/${d.rid}/members`, [orderBy("createdAt")], "createdAt", mapMember);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "kitchen", password: "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const full = members.data.length >= MAX_STAFF;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy("add");
    setError("");
    try {
      const r = await api<{ created: boolean }>("/api/staff", { method: "POST", body: form });
      setDone(
        r.created
          ? `${form.name} can now sign in with ${form.email} and the temporary password you set. Ask them to change it from the sign-in page (Forgot password).`
          : `${form.email} already had an account and has been added. They sign in with their existing password.`,
      );
      setForm({ name: "", email: "", role: "kitchen", password: "" });
      setOpen(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy("");
    }
  }

  async function remove(uid: string) {
    setBusy(uid);
    setError("");
    setDone("");
    try {
      await api("/api/staff", { method: "DELETE", body: { uid } });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Staff"
        subtitle={`${members.data.length} of ${MAX_STAFF} logins used. All logins belong to ${d.restaurant.name}.`}
        actions={
          <Button onClick={() => setOpen(true)} disabled={full} data-testid="add-staff">
            <UserPlus className="size-4" /> Add staff login
          </Button>
        }
      />
      {full && (
        <Alert tone="info" className="mb-4">
          Your plan includes {MAX_STAFF} logins. Remove someone to add a new person.
        </Alert>
      )}
      {done && <Alert tone="ok" className="mb-4">{done}</Alert>}
      {error && !open && <Alert tone="bad" className="mb-4">{error}</Alert>}
      {members.loading ? (
        <Spinner />
      ) : (
        <Card className="divide-y divide-line">
          {members.data.map((m) => (
            <div key={m.uid} className="flex flex-wrap items-center gap-3 p-4" data-testid={`member-${m.email}`}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {m.name} {m.uid === d.uid && <span className="text-sm font-normal text-muted">(you)</span>}
                </p>
                <p className="truncate text-sm text-muted">{m.email}</p>
              </div>
              <div className="text-right">
                <Badge tone={m.role === "owner" ? "dark" : "neutral"}>{ROLE_LABEL[m.role]}</Badge>
                <p className="mt-1 text-xs text-muted">Added {formatDate(m.createdAt)}</p>
              </div>
              {m.role !== "owner" && (
                <Button size="sm" variant="ghost" className="text-bad" loading={busy === m.uid} onClick={() => remove(m.uid)}>
                  Remove access
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {(["manager", "cashier", "kitchen"] as Role[]).map((r) => (
          <div key={r} className="rounded-lg border border-line bg-white p-4 text-sm">
            <p className="font-semibold">{ROLE_LABEL[r]}</p>
            <p className="mt-1 text-muted">{ROLE_HELP[r]}</p>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add staff login">
        <form onSubmit={add} className="space-y-4">
          <Field label="Name" htmlFor="s-name">
            <Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Email" htmlFor="s-email">
            <Input id="s-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Role" htmlFor="s-role" hint={ROLE_HELP[form.role as Role]}>
            <Select id="s-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Temporary password" htmlFor="s-pass" hint="At least 8 characters with letters and numbers. Share it with the person privately.">
            <Input id="s-pass" type="text" autoComplete="off" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          </Field>
          {error && <Alert tone="bad">{error}</Alert>}
          <Button type="submit" loading={busy === "add"}>
            Add login
          </Button>
        </form>
      </Modal>
    </div>
  );
}
