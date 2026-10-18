"use client";

import { useEffect } from "react";
import { SimplePage } from "@/components/SimplePage";

type Props = {
  error: Error & { digest?: string };
  retry: () => void;
  copy: { title: string; body: string; retry: string };
};

/** What error.tsx and global-error.tsx show: a plain message and a retry button. */
export function ErrorView({ error, retry, copy }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SimplePage title={copy.title}>
      <p>{copy.body}</p>
      <p className="mt-8">
        <button type="button" onClick={retry} className="button-quiet">
          {copy.retry}
        </button>
      </p>
    </SimplePage>
  );
}
