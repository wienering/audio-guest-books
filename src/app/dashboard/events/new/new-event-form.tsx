"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugifyRetailClientSlug } from "@/lib/retail-slug";

import {
  createEvent,
  type CreateEventFormValues,
  type CreateEventState,
} from "../actions";

const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday" },
  { value: "corporate", label: "Corporate" },
  { value: "anniversary", label: "Anniversary" },
  { value: "other", label: "Other" },
] as const;

function todayInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyFormValues(): CreateEventFormValues {
  return {
    name: "",
    eventType: EVENT_TYPES[0]?.value ?? "wedding",
    eventTypeOther: "",
    eventDate: todayInputValue(),
    retailClientName: "",
    retailClientEmail: "",
    retailClientSlug: "",
  };
}

export function NewEventForm() {
  const [state, dispatch, pending] = useActionState(
    createEvent,
    undefined as CreateEventState | undefined
  );

  const [fields, setFields] = useState<CreateEventFormValues>(emptyFormValues);
  const slugEdited = useRef(false);

  useEffect(() => {
    if (state?.ok === false && state.values) {
      setFields(state.values);
    }
  }, [state]);

  const nameError = state?.ok === false ? state.fieldErrors?.name : undefined;
  const eventTypeError =
    state?.ok === false ? state.fieldErrors?.eventType : undefined;
  const eventTypeOtherError =
    state?.ok === false ? state.fieldErrors?.eventTypeOther : undefined;
  const eventDateError =
    state?.ok === false ? state.fieldErrors?.eventDate : undefined;
  const retailClientNameError =
    state?.ok === false ? state.fieldErrors?.retailClientName : undefined;
  const retailClientEmailError =
    state?.ok === false ? state.fieldErrors?.retailClientEmail : undefined;
  const retailClientSlugError =
    state?.ok === false ? state.fieldErrors?.retailClientSlug : undefined;
  const errorMessage =
    state?.ok === false ? state.message : undefined;

  const showGeneralBanner =
    errorMessage &&
    !(
      state?.ok === false &&
      state.fieldErrors &&
      Object.keys(state.fieldErrors).length > 0 &&
      errorMessage === "Please fix the fields below."
    );

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>New event</CardTitle>
        <CardDescription>
          Create a guest book workspace. Retail client pages arrive in Stage 3.
        </CardDescription>
      </CardHeader>
      <form action={dispatch} className="space-y-6">
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Event name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Sarah & Jordan — wedding"
              required
              value={fields.name}
              onChange={(e) =>
                setFields((f) => ({ ...f, name: e.target.value }))
              }
              aria-invalid={!!nameError}
            />
            {nameError ? (
              <p className="text-destructive text-sm">{nameError}</p>
            ) : null}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="eventType">Event type</Label>
              <select
                id="eventType"
                name="eventType"
                value={fields.eventType}
                onChange={(e) =>
                  setFields((f) => ({ ...f, eventType: e.target.value }))
                }
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                aria-invalid={!!eventTypeError}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {eventTypeError ? (
                <p className="text-destructive text-sm">{eventTypeError}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDate">Event date</Label>
              <Input
                id="eventDate"
                name="eventDate"
                type="date"
                required
                value={fields.eventDate}
                onChange={(e) =>
                  setFields((f) => ({ ...f, eventDate: e.target.value }))
                }
                aria-invalid={!!eventDateError}
              />
              {eventDateError ? (
                <p className="text-destructive text-sm">{eventDateError}</p>
              ) : null}
            </div>
          </div>

          {fields.eventType === "other" ? (
            <div className="space-y-2">
              <Label htmlFor="eventTypeOther">Custom type</Label>
              <Input
                id="eventTypeOther"
                name="eventTypeOther"
                placeholder="e.g. Baby shower, fundraiser…"
                value={fields.eventTypeOther}
                onChange={(e) =>
                  setFields((f) => ({ ...f, eventTypeOther: e.target.value }))
                }
                aria-invalid={!!eventTypeOtherError}
              />
              {eventTypeOtherError ? (
                <p className="text-destructive text-sm">{eventTypeOtherError}</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="retailClientName">Retail client name</Label>
            <Input
              id="retailClientName"
              name="retailClientName"
              autoComplete="name"
              placeholder="Jordan Lee"
              required
              value={fields.retailClientName}
              onChange={(e) => {
                const name = e.target.value;
                setFields((f) => {
                  if (!slugEdited.current) {
                    const slug = slugifyRetailClientSlug(name);
                    if (slug.length >= 2) {
                      return { ...f, name, retailClientSlug: slug };
                    }
                  }
                  return { ...f, name };
                });
              }}
              aria-invalid={!!retailClientNameError}
            />
            {retailClientNameError ? (
              <p className="text-destructive text-sm">{retailClientNameError}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="retailClientEmail">Retail client email</Label>
            <Input
              id="retailClientEmail"
              name="retailClientEmail"
              type="email"
              autoComplete="email"
              placeholder="jordan@example.com"
              required
              value={fields.retailClientEmail}
              onChange={(e) =>
                setFields((f) => ({ ...f, retailClientEmail: e.target.value }))
              }
              aria-invalid={!!retailClientEmailError}
            />
            {retailClientEmailError ? (
              <p className="text-destructive text-sm">
                {retailClientEmailError}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="retailClientSlug">Client URL slug</Label>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Used on the retail link in Stage 3. Lowercase letters, numbers, and
              hyphens only.
            </p>
            <Input
              id="retailClientSlug"
              name="retailClientSlug"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              minLength={2}
              value={fields.retailClientSlug}
              onChange={(e) => {
                slugEdited.current = true;
                setFields((f) => ({
                  ...f,
                  retailClientSlug: e.target.value,
                }));
              }}
              aria-invalid={!!retailClientSlugError}
            />
            {retailClientSlugError ? (
              <p className="text-destructive text-sm">{retailClientSlugError}</p>
            ) : null}
          </div>

          {showGeneralBanner ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {errorMessage}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
            {pending ? "Creating…" : "Create event"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
