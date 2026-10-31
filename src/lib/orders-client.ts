"use client";
import { orderBy, where } from "firebase/firestore";
import { useLiveCollection } from "./firebase/hooks";
import { mapOrder } from "./mappers";

/** Live orders created since a moment, oldest first. One simple query, so no composite index is needed. */
export function useOrdersSince(rid: string, since: number) {
  return useLiveCollection(`restaurants/${rid}/orders`, [where("createdAt", ">=", since), orderBy("createdAt", "asc")], String(since), mapOrder);
}
