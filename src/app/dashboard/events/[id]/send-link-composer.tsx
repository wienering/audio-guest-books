"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { InvitationEmailPreview } from "./invitation-email-preview";
import { sendRetailInvitation } from "./send-invitation-actions";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  substituteMergeFields,
  SYSTEM_DEFAULT_RETAIL_INVITATION,
  type RetailInvitationMergeValues,
} from "@/lib/email-merge-fields";
import { cn } from "@/lib/utils";

export type ComposerEmailTemplate = {
  id: string;
  name: string;
  subject_template: string;
  body_template: string;
  is_default: boolean;
};

export type SendLinkComposerProps = {
  eventId: string;
  companyName: string;
  retailClientEmail: string;
  mergeFieldValues: RetailInvitationMergeValues;
  canUseCustomTemplates: boolean;
  templates: ComposerEmailTemplate[];
};

function applyTemplate(
  tpl: { subjectTemplate: string; bodyTemplate: string },
  values: RetailInvitationMergeValues
) {
  return {
    subject: substituteMergeFields(tpl.subjectTemplate, values),
    body: substituteMergeFields(tpl.bodyTemplate, values),
  };
}

export function SendLinkComposer(props: SendLinkComposerProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const formId = useId();

  const [to, setTo] = useState(props.retailClientEmail);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateKey, setTemplateKey] = useState<string>("default");
  const [busy, setBusy] = useState(false);

  const values = props.mergeFieldValues;

  function getInitialTemplateKey(): string {
    const def = props.templates.find((t) => t.is_default);
    if (def) return def.id;
    return "default";
  }

  function syncFromTemplate(key: string) {
    if (key === "default") {
      const r = applyTemplate(
        {
          subjectTemplate: SYSTEM_DEFAULT_RETAIL_INVITATION.subjectTemplate,
          bodyTemplate: SYSTEM_DEFAULT_RETAIL_INVITATION.bodyTemplate,
        },
        values
      );
      setSubject(r.subject);
      setBody(r.body);
      return;
    }
    const tpl = props.templates.find((t) => t.id === key);
    if (!tpl) return;
    const r = applyTemplate(
      {
        subjectTemplate: tpl.subject_template,
        bodyTemplate: tpl.body_template,
      },
      values
    );
    setSubject(r.subject);
    setBody(r.body);
  }

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onClose = () => {
      setBusy(false);
    };
    d.addEventListener("close", onClose);
    return () => d.removeEventListener("close", onClose);
  }, []);

  function openComposer() {
    setTo(props.retailClientEmail);
    const k = getInitialTemplateKey();
    setTemplateKey(k);
    syncFromTemplate(k);
    dialogRef.current?.showModal();
  }

  function onTemplateChange(key: string) {
    setTemplateKey(key);
    syncFromTemplate(key);
  }

  async function onSend() {
    setBusy(true);
    try {
      const template_source =
        templateKey !== "default" ? "custom" : "system";
      const res = await sendRetailInvitation(props.eventId, {
        to,
        subject,
        body,
        template_source,
      });
      if (!res.ok) {
        toast.error(`Failed to send email: ${res.error}`);
        return;
      }
      toast.success(`Email sent to ${to}`);
      dialogRef.current?.close();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const showSelector = props.canUseCustomTemplates && props.templates.length > 0;

  return (
    <>
      <button
        type="button"
        className={cn(
          buttonVariants({ size: "sm" }),
          "shrink-0 font-medium"
        )}
        onClick={() => openComposer()}
      >
        Send link
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 z-50 w-[min(100%,36rem)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-background p-0 shadow-xl backdrop:bg-black/50 lg:w-[min(100%,52rem)]"
      >
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold text-lg tracking-tight">
            Send retail link
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Email your client the gallery link. You can edit the message before
            sending.
          </p>
        </div>

        <div className="grid gap-6 px-5 py-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-to`}>To</Label>
              <Input
                id={`${formId}-to`}
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                autoComplete="email"
              />
            </div>

            {showSelector ? (
              <div className="space-y-2">
                <Label htmlFor={`${formId}-tpl`}>Template</Label>
                <select
                  id={`${formId}-tpl`}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                  value={templateKey}
                  onChange={(e) => onTemplateChange(e.target.value)}
                >
                  <option value="default">Default template</option>
                  {props.templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.is_default ? " (default)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor={`${formId}-sub`}>Subject</Label>
              <Input
                id={`${formId}-sub`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-body`}>Body</Label>
              <Textarea
                id={`${formId}-body`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={10_000}
                rows={12}
                className="min-h-[200px]"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                className={cn(buttonVariants({ size: "sm" }))}
                disabled={busy}
                onClick={() => void onSend()}
              >
                {busy ? "Sending…" : "Send email"}
              </button>
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                disabled={busy}
                onClick={() => dialogRef.current?.close()}
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-sm">Preview</p>
            <InvitationEmailPreview
              companyName={props.companyName}
              bodyPlain={body}
            />
          </div>
        </div>
      </dialog>
    </>
  );
}
