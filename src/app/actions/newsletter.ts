"use server";

import { unsubscribe } from "@/lib/newsletter";

export type UnsubscribeState = { status: "idle" | "done" | "invalid" };

/** The button on /unsubscribe (a button, so mail scanners that open links don't unsubscribe anyone). */
export async function unsubscribeAction(_previous: UnsubscribeState, form: FormData): Promise<UnsubscribeState> {
  const customerId = String(form.get("c") ?? "").slice(0, 64);
  const token = String(form.get("t") ?? "").slice(0, 128);
  return { status: (await unsubscribe(customerId, token)) ? "done" : "invalid" };
}
