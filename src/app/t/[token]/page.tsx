import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeatMenu } from "@/components/customer/seat-menu";
import { menuForSeat } from "@/lib/server/public";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const m = await menuForSeat(token);
  return { title: m ? `${m.restaurant.name} · ${m.seat.label}` : "Menu", robots: { index: false } };
}

/** The page a guest sees after scanning a seat's QR code. */
export default async function SeatPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const m = await menuForSeat(token);
  if (!m) notFound();
  return <SeatMenu token={token} menu={m} />;
}
