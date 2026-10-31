import { notFound } from "next/navigation";
import { MenuView } from "@/components/customer/menu-view";
import { menuForRestaurant } from "@/lib/server/public";
import { resolveHost } from "@/lib/server/restaurants";

export const dynamic = "force-dynamic";

/** Reached through middleware when a restaurant's own domain points at the platform. */
export default async function DomainPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const rid = await resolveHost(decodeURIComponent(host));
  const m = rid ? await menuForRestaurant(rid) : null;
  if (!m) notFound();
  return <MenuView menu={m} />;
}
