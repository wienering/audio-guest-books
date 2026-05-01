"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { InvitationEmailPreview } from "@/app/dashboard/events/[id]/invitation-email-preview";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MERGE_FIELDS_UI,
  mergeFieldSampleValues,
  substituteMergeFields,
  SYSTEM_DEFAULT_RETAIL_INVITATION,
} from "@/lib/email-merge-fields";
import { cn } from "@/lib/utils";

export type EmailTemplateRow = {
  id: string;
  name: string;
  subject_template: string;
  body_template: string;
  is_default: boolean;
};

type FocusField = "name" | "subject" | "body";

export function EmailTemplatesSettingsClient(props: {
  canEdit: boolean;
  companyName: string;
  initialTemplates: EmailTemplateRow[];
}) {
  const samples = useMemo(() => mergeFieldSampleValues(), []);
  const defaultSubject = useMemo(
    () =>
      substituteMergeFields(
        SYSTEM_DEFAULT_RETAIL_INVITATION.subjectTemplate,
        samples
      ),
    [samples]
  );
  const defaultBody = useMemo(
    () =>
      substituteMergeFields(
        SYSTEM_DEFAULT_RETAIL_INVITATION.bodyTemplate,
        samples
      ),
    [samples]
  );

  const [templates, setTemplates] = useState(props.initialTemplates);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [focusField, setFocusField] = useState<FocusField>("body");
  const [sel, setSel] = useState({ start: 0, end: 0 });

  const [deleteTarget, setDeleteTarget] = useState<EmailTemplateRow | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const deleteDialogRef = useRef<HTMLDialogElement | null>(null);

  async function refreshTemplates() {
    const r = await fetch("/api/email-templates");
    if (!r.ok) return;
    const j = (await r.json()) as { templates?: EmailTemplateRow[] };
    if (j.templates) setTemplates(j.templates);
  }

  function captureSel(
    field: FocusField,
    el: HTMLInputElement | HTMLTextAreaElement
  ) {
    setFocusField(field);
    setSel({
      start: el.selectionStart ?? 0,
      end: el.selectionEnd ?? 0,
    });
  }

  function insertPlaceholder(key: string) {
    const ph = `{{${key}}}`;
    const { start, end } = sel;
    if (focusField === "name") {
      setName((v) => v.slice(0, start) + ph + v.slice(end));
    } else if (focusField === "subject") {
      setSubject((v) => v.slice(0, start) + ph + v.slice(end));
    } else {
      setBody((v) => v.slice(0, start) + ph + v.slice(end));
    }
    const pos = start + ph.length;
    setSel({ start: pos, end: pos });
  }

  function resetForm() {
    setName("");
    setSubject("");
    setBody("");
    setIsDefault(false);
    setCreating(false);
    setEditingId(null);
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setName("");
    setSubject("");
    setBody("");
    setIsDefault(false);
  }

  function startEdit(t: EmailTemplateRow) {
    setEditingId(t.id);
    setCreating(false);
    setName(t.name);
    setSubject(t.subject_template);
    setBody(t.body_template);
    setIsDefault(t.is_default);
  }

  const previewSubject = useMemo(
    () => substituteMergeFields(subject, samples),
    [subject, samples]
  );
  const previewBody = useMemo(
    () => substituteMergeFields(body, samples),
    [body, samples]
  );

  async function saveTemplate() {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      toast.error("Name, subject, and body are required.");
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        const r = await fetch(`/api/email-templates/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            subject_template: subject.trim(),
            body_template: body.trim(),
            is_default: isDefault,
          }),
        });
        const j = (await r.json().catch(() => null)) as
          | { error?: string }
          | null;
        if (!r.ok) {
          toast.error(j?.error ?? "Could not update template.");
          return;
        }
        toast.success("Template saved.");
        resetForm();
        await refreshTemplates();
        return;
      }

      const r = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          subject_template: subject.trim(),
          body_template: body.trim(),
          is_default: isDefault,
        }),
      });
      const j = (await r.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!r.ok) {
        toast.error(j?.error ?? "Could not create template.");
        return;
      }
      toast.success("Template created.");
      resetForm();
      await refreshTemplates();
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const editing = editingId;
    setBusy(true);
    try {
      const r = await fetch(`/api/email-templates/${id}`, {
        method: "DELETE",
      });
      const j = (await r.json().catch(() => null)) as { error?: string } | null;
      if (!r.ok) {
        toast.error(j?.error ?? "Could not delete template.");
        return;
      }
      toast.success("Template deleted.");
      deleteDialogRef.current?.close();
      setDeleteTarget(null);
      if (editing === id) resetForm();
      await refreshTemplates();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email templates</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Reusable &quot;send link&quot; messages for client galleries. Ultimate
          can save custom templates with merge fields.
        </p>
      </div>

      {!props.canEdit ? (
        <div className="relative rounded-xl border bg-card p-6">
          <div className="pointer-events-none select-none opacity-60">
            <p className="font-medium text-sm">System default (example)</p>
            <p className="mt-3 text-muted-foreground text-sm">
              Subject: {defaultSubject}
            </p>
            <div className="mt-4 max-w-xl">
              <InvitationEmailPreview
                companyName={props.companyName}
                bodyPlain={defaultBody}
              />
            </div>
          </div>
          <div
            className="pointer-events-auto absolute inset-0 flex items-center justify-center rounded-xl bg-background/80 p-6 text-center backdrop-blur-[1px]"
            title="Save reusable templates with merge fields for different event types. Upgrade to Ultimate to unlock."
          >
            <p className="max-w-sm rounded-lg border bg-background px-4 py-3 text-sm shadow-sm">
              Create custom email templates with Ultimate. Save reusable
              templates with merge fields for different event types.
            </p>
          </div>
        </div>
      ) : null}

      {props.canEdit ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={cn(buttonVariants({ size: "sm" }))}
              onClick={() => startCreate()}
            >
              Create new template
            </button>
          </div>

          <div className="rounded-xl border">
            <ul className="divide-y">
              {templates.length === 0 ? (
                <li className="px-4 py-10 text-center text-muted-foreground text-sm">
                  No custom templates yet. The send-link composer uses the system
                  default until you add one (or set a default here).
                </li>
              ) : (
                templates.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {t.name}
                        {t.is_default ? (
                          <span className="ml-2 rounded-md bg-primary/15 px-2 py-0.5 text-primary text-xs font-medium">
                            Default
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 truncate text-muted-foreground text-sm">
                        {substituteMergeFields(t.subject_template, samples)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        onClick={() => startEdit(t)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={cn(
                          buttonVariants({ variant: "destructive", size: "sm" })
                        )}
                        onClick={() => {
                          setDeleteTarget(t);
                          queueMicrotask(() =>
                            deleteDialogRef.current?.showModal()
                          );
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {creating || editingId ? (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold text-lg tracking-tight">
                {editingId ? "Edit template" : "New template"}
              </h2>
              <div className="mt-6 grid gap-8 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tpl-name">Name</Label>
                    <Input
                      id="tpl-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={50}
                      onSelect={(e) =>
                        captureSel("name", e.target as HTMLInputElement)
                      }
                      onKeyUp={(e) =>
                        captureSel("name", e.target as HTMLInputElement)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tpl-subject">Subject template</Label>
                    <Input
                      id="tpl-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      maxLength={200}
                      onSelect={(e) =>
                        captureSel("subject", e.target as HTMLInputElement)
                      }
                      onKeyUp={(e) =>
                        captureSel("subject", e.target as HTMLInputElement)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tpl-body">Body template</Label>
                    <Textarea
                      id="tpl-body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      maxLength={10_000}
                      rows={12}
                      className="min-h-[180px]"
                      onSelect={(e) =>
                        captureSel("body", e.target as HTMLTextAreaElement)
                      }
                      onKeyUp={(e) =>
                        captureSel("body", e.target as HTMLTextAreaElement)
                      }
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                    />
                    Set as default for send-link emails
                  </label>

                  <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                    <p className="font-medium text-sm">Merge fields</p>
                    <p className="text-muted-foreground text-xs">
                      Inserts at the cursor in the focused field (click a field
                      first).
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {MERGE_FIELDS_UI.map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "text-xs"
                          )}
                          onClick={() => insertPlaceholder(m.key)}
                        >
                          {`{{${m.key}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={cn(buttonVariants({ size: "sm" }))}
                      disabled={busy}
                      onClick={() => void saveTemplate()}
                    >
                      {busy ? "Saving…" : editingId ? "Save changes" : "Create"}
                    </button>
                    <button
                      type="button"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" })
                      )}
                      disabled={busy}
                      onClick={() => resetForm()}
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-sm">Live preview</p>
                  <p className="text-muted-foreground text-xs">
                    Sample data: {samples.client_first_name},{" "}
                    {samples.company_name}, {samples.event_date}
                  </p>
                  <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground text-xs uppercase">
                      Subject
                    </span>
                    <br />
                    {previewSubject}
                  </p>
                  <InvitationEmailPreview
                    companyName={props.companyName}
                    bodyPlain={previewBody}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <dialog
        ref={deleteDialogRef}
        className="fixed top-1/2 left-1/2 w-[min(100%,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-5 shadow-xl backdrop:bg-black/50"
        onClose={() => setDeleteTarget(null)}
      >
        {deleteTarget ? (
          <>
            <p className="font-medium">Delete template?</p>
            <p className="mt-2 text-muted-foreground text-sm">
              {deleteTarget.name} will be removed. If it was the default, the
              composer falls back to the system default.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
                onClick={() => deleteDialogRef.current?.close()}
              >
                Cancel
              </button>
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "destructive", size: "sm" })
                )}
                disabled={busy}
                onClick={() => void confirmDelete()}
              >
                Delete
              </button>
            </div>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
