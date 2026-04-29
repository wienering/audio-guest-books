"use client";

import { useActionState } from "react";

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

import {
  completeOnboarding,
  type OnboardingActionState,
} from "./actions";

type FormProps = {
  rootDomain: string;
};

export function OnboardingForm(props: FormProps) {
  const { rootDomain } = props;

  const [state, dispatch, pending] = useActionState(
    completeOnboarding,
    undefined as OnboardingActionState | undefined,
  );

  const nameError =
    state && "fieldErrors" in state ? state.fieldErrors?.companyName : undefined;
  const slugError =
    state && "fieldErrors" in state ? state.fieldErrors?.companySlug : undefined;
  const errorMessage =
    state && state.ok === false ? state.message : undefined;

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>
          Choose how clients will recognize you. You can refine details later.
        </CardDescription>
      </CardHeader>
      <form action={dispatch} className="space-y-8">
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              name="companyName"
              autoComplete="organization"
              placeholder="Nova Audio Memories"
              required
              aria-invalid={!!nameError}
            />
            {nameError ? (
              <p className="text-destructive text-sm">{nameError}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="companySlug">Company URL slug</Label>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Your guests will browse{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85rem]">{`slug.${rootDomain}`}</code>{" "}
              in production. Retail paths like{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85rem]">{`slug.${rootDomain}/{client}`}</code>{" "}
              arrive in Stage 3.
            </p>
            <Input
              id="companySlug"
              name="companySlug"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="nova-audio"
              required
              aria-invalid={!!slugError}
            />
            <p className="text-muted-foreground text-xs">
              Lowercase letters, numbers, and hyphens — no leading or trailing
              hyphen.
            </p>
            {slugError ? (
              <p className="text-destructive text-sm">{slugError}</p>
            ) : null}
          </div>
          {errorMessage ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {errorMessage}
            </div>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating workspace…" : "Continue to dashboard"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
