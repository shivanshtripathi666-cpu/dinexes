import type { OrderStatus, Role } from "./roles";

export type SubscriptionStatus = "trialing" | "active" | "expired";

export interface Hours {
  day: string;
  open: string; // "09:00"
  close: string; // "23:00"
  closed: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  ownerUid: string;
  logoUrl: string;
  coverUrl: string;
  tagline: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  cuisines: string[];
  hours: Hours[];
  seatCount: number;
  onboarded: boolean;
  createdAt: number;
  trialEndsAt: number;
  subscription: { status: SubscriptionStatus; currentPeriodEnd: number | null };
  settings: { voiceLang: "en" | "hi"; acceptingOrders: boolean };
}

export interface Member {
  uid: string;
  name: string;
  email: string;
  role: Role;
  duty: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  sort: number;
}

export interface Dish {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  pricePaise: number;
  photoUrl: string;
  veg: boolean;
  available: boolean;
  sort: number;
  ratingAvg: number;
  ratingCount: number;
}

export interface Seat {
  id: string;
  number: number;
  label: string;
  token: string;
  active: boolean;
}

export interface OrderLine {
  dishId: string;
  name: string;
  qty: number;
  unitPaise: number;
  linePaise: number;
}

export interface Order {
  id: string;
  number: number;
  seatId: string;
  seatNumber: number;
  seatLabel: string;
  items: OrderLine[];
  note: string;
  totalPaise: number;
  status: OrderStatus;
  paymentStatus: "unpaid" | "paid";
  paymentMethod: "" | "cash" | "upi" | "card";
  createdAt: number;
  updatedAt: number;
  acceptedAt: number | null;
  readyAt: number | null;
  dayKey: string;
  publicToken: string;
}

export interface PublicOrderStatus {
  restaurantName: string;
  restaurantSlug: string;
  seatToken: string;
  number: number;
  seatLabel: string;
  items: { name: string; qty: number; dishId?: string }[];
  totalPaise: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  rated?: boolean;
}

export interface DayStats {
  day: string;
  orders: number;
  cancelled: number;
  salesPaise: number;
  collectedPaise: number;
  dishes: Record<string, { name: string; qty: number }>;
}

export interface Payment {
  id: string;
  amountPaise: number;
  status: "created" | "paid" | "failed";
  provider: "razorpay";
  providerOrderId: string;
  providerPaymentId: string;
  plan: string;
  periodStart: number | null;
  periodEnd: number | null;
  createdAt: number;
}

/** What GET /api/me returns to the dashboard. */
export interface MeResponse {
  uid: string;
  email: string;
  emailVerified: boolean;
  member: Member | null;
  restaurant: Restaurant | null;
  access: Access | null;
}

export interface Access {
  state: SubscriptionStatus;
  endsAt: number;
  daysLeft: number;
  canOrder: boolean;
}
