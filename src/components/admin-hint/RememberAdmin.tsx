"use client";

import { useEffect } from "react";
import { syncAdminAccountAction } from "@/app/admin/actions";
import { accountStore } from "@/components/account/account-store";
import { adminHintStore } from "./admin-hint-store";

/**
 * Marks this browser as the artist's while an admin page is open, and makes
 * the storefront header show the admin as the signed-in user (never a
 * customer who used this browser before).
 */
export function RememberAdmin() {
  useEffect(() => {
    adminHintStore.set();
    let current = true;
    syncAdminAccountAction()
      .then((account) => {
        if (current && account) accountStore.set(account);
      })
      .catch(() => {
        // Signed out meanwhile; the next page load sorts it out.
      });
    return () => {
      current = false;
    };
  }, []);
  return null;
}
