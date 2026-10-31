"use client";
import { useDash } from "@/components/dash-context";
import { NoAccess } from "@/components/dash-shell";
import { SeatsManager } from "@/components/seats-manager";
import { PageHeader } from "@/components/ui";
import { can } from "@/lib/roles";

export default function QrPage() {
  const d = useDash();
  if (!can(d.role, "seats.manage")) return <NoAccess />;
  return (
    <div>
      <PageHeader title="Seats & QR codes" subtitle="Every seat has its own code. Guests scan it and the order arrives with the seat number." />
      <SeatsManager rid={d.rid} restaurantName={d.restaurant.name} />
    </div>
  );
}
