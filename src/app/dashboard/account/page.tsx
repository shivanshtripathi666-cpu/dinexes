"use client";
import { LogOut, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDash } from "@/components/dash-context";
import { Modal } from "@/components/modal";
import { useSession } from "@/components/session";
import { Alert, Button, Card, Input, PageHeader } from "@/components/ui";
import { ApiError, api, errorText } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/roles";

/** Every staff member's own account: who is signed in, sign out, delete the account. */
export default function AccountPage() {
  const d = useDash();
  const { user, signOut } = useSession();
  const router = useRouter();
  const owner = d.role === "owner";
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  async function out() {
    await signOut();
    router.replace("/login");
  }

  async function del() {
    setBusy(true);
    setError("");
    setNeedsLogin(false);
    try {
      await api("/api/me", { method: "DELETE", body: { confirmName: confirm } });
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
      await signOut().catch(() => undefined);
      router.replace("/?deleted=1");
    } catch (e) {
      if (e instanceof ApiError && e.code === "recent_login") setNeedsLogin(true);
      setError(errorText(e));
      setBusy(false);
    }
  }

  const canDelete = !owner || confirm.trim().toLowerCase() === d.restaurant.name.trim().toLowerCase();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Your account" />
      <Card className="p-5 sm:p-6">
        <dl className="grid gap-3 text-sm sm:grid-cols-[140px_1fr]">
          <dt className="text-muted">Signed in as</dt>
          <dd className="font-semibold" data-testid="account-id">
            {user?.email || user?.phoneNumber || d.email || "—"}
          </dd>
          {user?.email && user?.phoneNumber && (
            <>
              <dt className="text-muted">Phone</dt>
              <dd className="font-semibold">{user.phoneNumber}</dd>
            </>
          )}
          <dt className="text-muted">Restaurant</dt>
          <dd className="font-semibold">{d.restaurant.name}</dd>
          <dt className="text-muted">Role</dt>
          <dd className="font-semibold">{ROLE_LABEL[d.role]}</dd>
        </dl>
        <Button variant="dark" className="mt-6 w-full sm:w-auto" onClick={out} data-testid="sign-out">
          <LogOut className="size-4" /> Sign out
        </Button>
      </Card>

      <Card className="border-bad/30 p-5 sm:p-6">
        <h2 className="font-semibold text-bad">Delete account</h2>
        <p className="mt-1 text-sm text-muted">
          {owner
            ? "Deletes your restaurant for good: menu, photos, QR codes, orders, reports and every staff login. Printed QR codes stop working. This cannot be undone."
            : "Removes your login and your access to this restaurant. The restaurant and its orders stay with the owner."}
        </p>
        <Button variant="danger" className="mt-4 w-full sm:w-auto" onClick={() => setOpen(true)} data-testid="delete-account">
          <Trash2 className="size-4" /> Delete my account
        </Button>
      </Card>

      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Delete account?">
        <div className="space-y-4">
          {owner ? (
            <>
              <p className="text-sm text-muted">
                To confirm, type your restaurant name: <strong className="text-ink">{d.restaurant.name}</strong>
              </p>
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Restaurant name to confirm" autoComplete="off" data-testid="delete-confirm" />
            </>
          ) : (
            <p className="text-sm text-muted">Your login will be deleted. The owner can add you again later.</p>
          )}
          {error && <Alert tone="bad">{error}</Alert>}
          <div className="flex flex-wrap gap-2">
            {needsLogin ? (
              <Button variant="dark" onClick={out}>
                Sign out and sign in again
              </Button>
            ) : (
              <Button variant="danger" loading={busy} disabled={!canDelete} onClick={del} data-testid="delete-confirm-button">
                Delete for good
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
