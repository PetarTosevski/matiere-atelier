import type { ReactNode } from "react";

type Props = { title: string; children: ReactNode };

/** Heading plus a narrow text column, for the simpler pages. */
export function SimplePage({ title, children }: Props) {
  return (
    <div className="site-container pt-2 md:pt-6">
      <h1 className="text-2xl tracking-tight md:text-3xl">{title}</h1>
      <div className="mt-6 max-w-prose text-muted">{children}</div>
    </div>
  );
}
