"use client";
import { RequireRestaurant } from "@/components/dash-context";
import { DashShell } from "@/components/dash-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRestaurant>
      <DashShell>{children}</DashShell>
    </RequireRestaurant>
  );
}
