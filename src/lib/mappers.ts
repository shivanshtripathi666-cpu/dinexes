import type { Category, DayStats, Dish, Member, Order, Payment, Restaurant, Seat } from "./types";

type D = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const a = (d: D) => d as any;

export const mapCategory = (id: string, d: D): Category => ({ id, name: a(d).name || "", sort: a(d).sort || 0 });

export const mapDish = (id: string, d: D): Dish => ({
  id,
  categoryId: a(d).categoryId,
  name: a(d).name || "",
  description: a(d).description || "",
  pricePaise: a(d).pricePaise || 0,
  photoUrl: a(d).photoUrl || "",
  veg: !!a(d).veg,
  available: a(d).available !== false,
  sort: a(d).sort || 0,
  ratingAvg: a(d).ratingCount ? Math.round(((a(d).ratingSum || 0) / a(d).ratingCount) * 10) / 10 : 0,
  ratingCount: a(d).ratingCount || 0,
});

export const mapSeat = (id: string, d: D): Seat => ({
  id,
  number: a(d).number,
  label: a(d).label || `Seat ${a(d).number}`,
  token: a(d).token,
  active: a(d).active !== false,
});

export const mapOrder = (id: string, d: D): Order => ({
  id,
  number: a(d).number,
  seatId: a(d).seatId,
  seatNumber: a(d).seatNumber,
  seatLabel: a(d).seatLabel || `Seat ${a(d).seatNumber}`,
  items: a(d).items || [],
  note: a(d).note || "",
  totalPaise: a(d).totalPaise || 0,
  status: a(d).status,
  paymentStatus: a(d).paymentStatus === "paid" ? "paid" : "unpaid",
  paymentMethod: a(d).paymentMethod || "",
  createdAt: a(d).createdAt || 0,
  updatedAt: a(d).updatedAt || 0,
  acceptedAt: a(d).acceptedAt || null,
  readyAt: a(d).readyAt || null,
  dayKey: a(d).dayKey || "",
  publicToken: a(d).publicToken || "",
});

export const mapMember = (id: string, d: D): Member => ({ uid: id, name: a(d).name || "", email: a(d).email || "", role: a(d).role, duty: a(d).duty || "", createdAt: a(d).createdAt || 0 });

export const mapDay = (id: string, d: D): DayStats => ({
  day: id,
  orders: a(d).orders || 0,
  cancelled: a(d).cancelled || 0,
  salesPaise: a(d).salesPaise || 0,
  collectedPaise: a(d).collectedPaise || 0,
  dishes: a(d).dishes || {},
});

export const mapPayment = (id: string, d: D): Payment => ({
  id,
  amountPaise: a(d).amountPaise || 0,
  status: a(d).status || "created",
  provider: "razorpay",
  providerOrderId: a(d).providerOrderId || id,
  providerPaymentId: a(d).providerPaymentId || "",
  plan: a(d).plan || "m1",
  periodStart: a(d).periodStart || null,
  periodEnd: a(d).periodEnd || null,
  createdAt: a(d).createdAt || 0,
});

export const mapRestaurant = (id: string, x: D): Restaurant => ({
  id,
  name: a(x).name || "",
  slug: a(x).slug || "",
  ownerUid: a(x).ownerUid || "",
  logoUrl: a(x).logoUrl || "",
  coverUrl: a(x).coverUrl || "",
  tagline: a(x).tagline || "",
  address: a(x).address || "",
  city: a(x).city || "",
  phone: a(x).phone || "",
  email: a(x).email || "",
  cuisines: a(x).cuisines || [],
  hours: a(x).hours || [],
  seatCount: a(x).seatCount || 0,
  onboarded: !!a(x).onboarded,
  createdAt: a(x).createdAt || 0,
  trialEndsAt: a(x).trialEndsAt || 0,
  subscription: { status: a(x).subscription?.status || "trialing", currentPeriodEnd: a(x).subscription?.currentPeriodEnd || null },
  settings: { voiceLang: a(x).settings?.voiceLang === "hi" ? "hi" : "en", acceptingOrders: a(x).settings?.acceptingOrders !== false },
});
