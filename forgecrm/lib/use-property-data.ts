"use client";

import { usePropertyStore, type PropertyState } from "./property-store";

/**
 * The whole property store (entities + actions). Pass straight into selector helpers in
 * lib/payments, lib/maintenance, etc., and call actions off the same object.
 */
export function usePropertyData(): PropertyState {
  return usePropertyStore();
}
