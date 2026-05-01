"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { saveCompanyPublicContact } from "./actions";

export type PublicPageSettingsClientProps = {
  initialContactEmail: string | null;
  initialContactPhone: string | null;
  initialContactWebsite: string | null;
};

export function PublicPageSettingsClient(props: PublicPageSettingsClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState(props.initialContactEmail ?? "");
  const [phone, setPhone] = useState(props.initialContactPhone ?? "");
  const [website, setWebsite] = useState(props.initialContactWebsite ?? "");

  useEffect(() => {
    setEmail(props.initialContactEmail ?? "");
    setPhone(props.initialContactPhone ?? "");
    setWebsite(props.initialContactWebsite ?? "");
  }, [
    props.initialContactEmail,
    props.initialContactPhone,
    props.initialContactWebsite,
  ]);

  function save() {
    startTransition(async () => {
      const r = await saveCompanyPublicContact({
        contactEmail: email,
        contactPhone: phone,
        contactWebsite: website,
      });
      if (r.ok) {
        toast.success("Public page contact details saved.");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="contactEmail">Contact email</Label>
        <Input
          id="contactEmail"
          type="email"
          autoComplete="email"
          placeholder="hello@yourstudio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Shown on your company guest book landing page. Leave blank to omit.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactPhone">Contact phone</Label>
        <Input
          id="contactPhone"
          type="tel"
          autoComplete="tel"
          placeholder="+1 555 0100"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactWebsite">Website</Label>
        <Input
          id="contactWebsite"
          type="url"
          autoComplete="url"
          placeholder="https://yourstudio.com"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Your main site or social link. You can include or omit{" "}
          <span className="font-mono text-[0.7rem]">https://</span>
        </p>
      </div>
      <Button type="button" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
