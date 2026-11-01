import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderStatusView } from "@/components/customer/order-status";
import { db } from "@/lib/server/firebaseAdmin";
import type { PublicOrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your order", robots: { index: false } };

/** Order confirmation, shown only after the server has saved the order. Updates live. */
export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9]{16,40}$/.test(token)) notFound();
  const d = await db().doc(`orderStatus/${token}`).get();
  if (!d.exists) notFound();
  const x = d.data()!;
  const initial: PublicOrderStatus = {
    restaurantName: x.restaurantName,
    restaurantSlug: x.restaurantSlug,
    seatToken: "",
    rated: !!x.rated,
    number: x.number,
    seatLabel: x.seatLabel,
    items: x.items,
    totalPaise: x.totalPaise,
    status: x.status,
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  };
  return <OrderStatusView token={token} initial={initial} />;
}
