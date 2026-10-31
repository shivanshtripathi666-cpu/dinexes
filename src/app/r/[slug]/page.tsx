import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuView } from "@/components/customer/menu-view";
import { menuForRestaurant } from "@/lib/server/public";
import { resolveSlug } from "@/lib/server/restaurants";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const rid = await resolveSlug(slug);
  const m = rid ? await menuForRestaurant(rid) : null;
  return { title: m ? m.restaurant.name : "Restaurant" };
}

/** Public restaurant page (view only). Ordering happens from a seat's QR code. */
export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rid = await resolveSlug(slug);
  const m = rid ? await menuForRestaurant(rid) : null;
  if (!m) notFound();
  return <MenuView menu={m} />;
}
