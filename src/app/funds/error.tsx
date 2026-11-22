"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type FundsErrorProps = {
  error: unknown;
  retry: () => void;
};

// Shown when the fund API is down or times out, for /funds and every fund page.
const FundsError = ({ error, retry }: FundsErrorProps) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Couldn’t load fund data</h1>
      <p className="text-muted-foreground">
        The mutual fund data service didn’t respond. Please try again in a moment.
      </p>
      <Button onClick={retry}>Try again</Button>
    </main>
  );
};

export default FundsError;
