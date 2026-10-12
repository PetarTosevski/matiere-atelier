"use client";

import { logoutAction } from "@/app/admin/actions";
import { accountStore } from "@/components/account/account-store";
import { adminHintStore } from "./admin-hint-store";

/** Logs out of the admin and the admin's account, and clears both from the header. */
export function LogoutForm({ label }: { label: string }) {
  return (
    <form action={logoutAction} onSubmit={() => {
        adminHintStore.clear();
        accountStore.clear();
      }}>
      <button type="submit" className="inline-flex min-h-10 items-center underline-offset-4 hover:underline">
        {label}
      </button>
    </form>
  );
}
