import type { ReactNode } from "react";

type Props = { title: string; children: ReactNode };

/** Heading plus a narrow text column, for the simpler pages. */
export function SimplePage({ title, children }: Props) {
  return (
    <div className="site-container pt-12 md:pt-16 lg:pt-20">
      <h1 className="heading-display">{title}</h1>
      <div className="mt-8 max-w-prose leading-[1.65] text-muted">{children}</div>
    </div>
  );
}
