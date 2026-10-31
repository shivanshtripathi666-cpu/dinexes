"use client";
import { collection, doc, onSnapshot, query, type QueryConstraint } from "firebase/firestore";
import { useEffect, useState } from "react";
import { fb } from "./client";

export interface Live<T> {
  data: T;
  loading: boolean;
  error: string;
}

function message(e: { code?: string; message?: string }) {
  return e.code === "permission-denied" ? "You do not have access to this." : "Live updates are interrupted. Check your internet connection.";
}

/** Live list from Firestore (realtime). Pass path = null to wait. `key` must change when constraints change. */
export function useLiveCollection<T>(path: string | null, constraints: QueryConstraint[], key: string, map: (id: string, d: Record<string, unknown>) => T): Live<T[]> {
  const [state, setState] = useState<Live<T[]>>({ data: [], loading: true, error: "" });
  useEffect(() => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true }));
    const q = query(collection(fb().db, path), ...constraints);
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => map(d.id, d.data())), loading: false, error: "" }),
      (e) => setState((s) => ({ ...s, loading: false, error: message(e) })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key]);
  return state;
}

/** Live single document. */
export function useLiveDoc<T>(path: string | null, map: (id: string, d: Record<string, unknown>) => T): Live<T | null> {
  const [state, setState] = useState<Live<T | null>>({ data: null, loading: true, error: "" });
  useEffect(() => {
    if (!path) return;
    return onSnapshot(
      doc(fb().db, path),
      (snap) => setState({ data: snap.exists() ? map(snap.id, snap.data()) : null, loading: false, error: "" }),
      (e) => setState((s) => ({ ...s, loading: false, error: message(e) })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return state;
}
