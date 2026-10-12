"use client";

import { useEffect } from "react";
import { accountStore, type AccountHint } from "./account-store";

/**
 * Brings the browser's hint in line with the server: the account page passes
 * who is signed in, the login page passes null when nobody is.
 */
export function AccountHintSync({ account }: { account: AccountHint | null }) {
  const firstName = account?.firstName;
  const name = account?.name;
  const email = account?.email;
  useEffect(() => {
    if (firstName !== undefined && name !== undefined && email !== undefined) accountStore.set({ firstName, name, email });
    else accountStore.clear();
  }, [firstName, name, email]);
  return null;
}
