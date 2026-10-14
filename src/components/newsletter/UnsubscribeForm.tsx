"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { unsubscribeAction, type UnsubscribeState } from "@/app/actions/newsletter";
import { FormAlert, FormSuccess } from "@/components/auth/fields";
import { Link } from "@/i18n/navigation";

const idle: UnsubscribeState = { status: "idle" };

export function UnsubscribeForm({ customerId, token }: { customerId: string; token: string }) {
  const t = useTranslations("Unsubscribe");
  const [state, action, pending] = useActionState(unsubscribeAction, idle);

  if (state.status === "done") {
    return (
      <div className="space-y-6">
        <FormSuccess>{t("done")}</FormSuccess>
        <Link href="/originals" className="button-quiet">
          {t("browse")}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="c" value={customerId} />
      <input type="hidden" name="t" value={token} />
      <button type="submit" disabled={pending} className="button-primary">
        {pending ? t("submitting") : t("submit")}
      </button>
      <FormAlert className="mt-4">{state.status === "invalid" && t("invalid")}</FormAlert>
    </form>
  );
}
