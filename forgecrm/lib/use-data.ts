"use client";

import { useStore, type StoreState } from "./store";

/**
 * The whole store. StoreState is a superset of repository's DataView, so the
 * return value can be passed straight to selector functions in lib/repository.ts,
 * and actions (applyRule, sendQuote, …) are available on the same object.
 */
export function useData(): StoreState {
  return useStore();
}
