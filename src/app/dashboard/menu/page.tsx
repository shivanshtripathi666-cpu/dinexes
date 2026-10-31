"use client";
import { useDash } from "@/components/dash-context";
import { NoAccess } from "@/components/dash-shell";
import { MenuManager } from "@/components/menu-manager";
import { PageHeader } from "@/components/ui";
import { can } from "@/lib/roles";

export default function MenuPage() {
  const d = useDash();
  if (!can(d.role, "menu.availability")) return <NoAccess />;
  const edit = can(d.role, "menu.edit");
  return (
    <div className="max-w-4xl">
      <PageHeader title="Menu" subtitle={edit ? "Categories, dishes, prices and photos. Switch a dish off when it is sold out." : "Switch a dish off when it is sold out."} />
      <MenuManager rid={d.rid} canEdit={edit} />
    </div>
  );
}
