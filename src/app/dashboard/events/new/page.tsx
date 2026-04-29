import Link from "next/link";

import { NewEventForm } from "./new-event-form";

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex text-muted-foreground text-sm hover:text-foreground"
      >
        ← Back to events
      </Link>
      <NewEventForm />
    </div>
  );
}
