"use client";

import { useEffect } from "react";
import { adminHintStore } from "./admin-hint-store";

/** Marks this browser as the artist's while an admin page is open. */
export function RememberAdmin() {
  useEffect(() => adminHintStore.set(), []);
  return null;
}
