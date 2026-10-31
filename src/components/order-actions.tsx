"use client";
import { useState } from "react";
import { api, errorText } from "@/lib/api";
import { canTransition, type OrderStatus, type Role } from "@/lib/roles";
import type { Order } from "@/lib/types";
import { Button } from "./ui";

const NEXT_LABEL: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new: { to: "accepted", label: "Accept" },
  accepted: { to: "preparing", label: "Start preparing" },
  preparing: { to: "ready", label: "Mark ready" },
  ready: { to: "served", label: "Mark served" },
};

export function useOrderAction() {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function setStatus(o: Order, to: OrderStatus) {
    setBusy(`${o.id}-${to}`);
    setError("");
    try {
      await api(`/api/orders/${o.id}`, { method: "PATCH", body: { status: to } });
    } catch (e) {
      setError(`Order #${o.number}: ${errorText(e)}`);
    } finally {
      setBusy("");
    }
  }
  async function setPaid(o: Order, paid: boolean, method: "cash" | "upi" | "card" = "cash") {
    setBusy(`${o.id}-pay`);
    setError("");
    try {
      await api(`/api/orders/${o.id}`, { method: "PATCH", body: { paid, method } });
    } catch (e) {
      setError(`Order #${o.number}: ${errorText(e)}`);
    } finally {
      setBusy("");
    }
  }
  return { busy, error, setError, setStatus, setPaid };
}

export function NextStepButton({ o, role, busy, onStatus, size = "md" }: { o: Order; role: Role; busy: string; onStatus: (o: Order, to: OrderStatus) => void; size?: "sm" | "md" | "lg" }) {
  const n = NEXT_LABEL[o.status];
  if (!n || !canTransition(role, o.status, n.to)) return null;
  return (
    <Button size={size} variant={n.to === "ready" || n.to === "served" ? "ok" : "dark"} loading={busy === `${o.id}-${n.to}`} onClick={() => onStatus(o, n.to)} className="flex-1">
      {n.label}
    </Button>
  );
}
