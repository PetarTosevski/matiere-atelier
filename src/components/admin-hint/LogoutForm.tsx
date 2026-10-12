"use client";

import { logoutAction } from "@/app/admin/actions";
import { adminHintStore } from "./admin-hint-store";

/** Logs out and removes the storefront's Edit link from this browser. */
export function LogoutForm({ label }: { label: string }) {
  return (
    <form action={logoutAction} onSubmit={() => adminHintStore.clear()}>
      <button type="submit" className="inline-flex min-h-10 items-center underline-offset-4 hover:underline">
        {label}
      </button>
    </form>
  );
}
