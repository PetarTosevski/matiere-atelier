"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { resolveCartAction } from "@/app/actions/cart";
import type { CartItem, RemovedItem } from "@/lib/cart";
import { cartStore } from "./cart-store";

type CartContextValue = {
  /** False in showcase mode: no cart UI is shown at all. */
  enabled: boolean;
  /** True once the browser's saved cart has been read. */
  hydrated: boolean;
  ids: string[];
  /** Server-checked items for the current IDs; null while checking. */
  items: CartItem[] | null;
  has: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Re-checks the cart with the server (e.g. after a failed checkout). */
  refresh: () => void;
  /** Pieces dropped because they sold, were unpublished or lost their price. */
  notices: RemovedItem[];
  dismissNotices: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const noopSubscribe = () => () => {};

export function CartProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const ids = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [resolved, setResolved] = useState<{ key: string; items: CartItem[] } | null>(null);
  const [notices, setNotices] = useState<RemovedItem[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);

  const key = ids.join(",");

  // Ask the server which remembered pieces can still be bought.
  useEffect(() => {
    if (!enabled || !hydrated) return;
    let cancelled = false;

    resolveCartAction(ids).then((result) => {
      if (cancelled) return;
      if (result.removed.length > 0) {
        const gone = new Set(result.removed.map((item) => item.id));
        const remaining = ids.filter((id) => !gone.has(id));
        setNotices((current) => [...current, ...result.removed]);
        setResolved({ key: remaining.join(","), items: result.items });
        cartStore.set(remaining);
      } else {
        setResolved({ key: ids.join(","), items: result.items });
      }
    }).catch((error: unknown) => {
      // Offline or a server error: keep the cart as it is and try on the next load.
      console.error("[cart] could not check the cart", error);
    });

    return () => {
      cancelled = true;
    };
  }, [ids, enabled, hydrated, refreshCount]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const add = useCallback((id: string) => cartStore.set([...cartStore.getSnapshot(), id]), []);
  const remove = useCallback(
    (id: string) => cartStore.set(cartStore.getSnapshot().filter((item) => item !== id)),
    [],
  );
  const clear = useCallback(() => cartStore.set([]), []);
  const refresh = useCallback(() => setRefreshCount((count) => count + 1), []);
  const dismissNotices = useCallback(() => setNotices([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      enabled,
      hydrated,
      ids,
      items: resolved?.key === key ? resolved.items : null,
      has,
      add,
      remove,
      clear,
      refresh,
      notices,
      dismissNotices,
    }),
    [enabled, hydrated, ids, resolved, key, has, add, remove, clear, refresh, notices, dismissNotices],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside <CartProvider>");
  return value;
}
