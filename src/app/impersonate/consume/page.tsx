import { Suspense } from "react";

import { ConsumeImpersonationClient } from "./consume-client";

export default function ImpersonateConsumePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ConsumeImpersonationClient />
    </Suspense>
  );
}
