import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { Resend } from "resend";

import { db } from "@/db/index";
import { emailLog } from "@/db/schema";

type EmailKind = NonNullable<typeof emailLog.$inferInsert.kind>;

let resendClient: Resend | null | undefined;

function getResend(): Resend | null {
  if (resendClient !== undefined) {
    return resendClient;
  }
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    resendClient = null;
    return null;
  }
  resendClient = new Resend(key);
  return resendClient;
}

export type SendEmailParams = {
  to: string;
  subject: string;
  react: ReactElement;
  kind: EmailKind;
  eventId?: string;
  companyId?: string;
};

export type SendEmailResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Queues outbound email without blocking the caller. Never throws.
 * Every attempt is recorded in `email_log`.
 */
export function sendEmail(params: SendEmailParams): void {
  void deliverEmail(params);
}

/**
 * Awaits Resend (and logs to `email_log`). Use when the caller must know success/failure.
 */
export function sendEmailWithResult(
  params: SendEmailParams
): Promise<SendEmailResult> {
  return deliverEmail(params);
}

async function deliverEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const replyTo = process.env.RESEND_REPLY_TO?.trim();
  let html: string;
  try {
    html = await render(params.react);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.insert(emailLog).values({
      toEmail: params.to,
      kind: params.kind,
      eventId: params.eventId ?? null,
      companyId: params.companyId ?? null,
      subject: params.subject,
      status: "failed",
      errorMessage: `react render: ${msg}`,
      sentAt: null,
    });
    return { ok: false, error: `Failed to render email: ${msg}` };
  }

  const resend = getResend();
  if (!from || !resend) {
    const err = !from
      ? "RESEND_FROM_EMAIL is not set"
      : "RESEND_API_KEY is not set";
    await db.insert(emailLog).values({
      toEmail: params.to,
      kind: params.kind,
      eventId: params.eventId ?? null,
      companyId: params.companyId ?? null,
      subject: params.subject,
      status: "failed",
      errorMessage: err,
      sentAt: null,
    });
    return { ok: false, error: err };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html,
      replyTo: replyTo || undefined,
    });
    if (error) {
      const errMsg =
        "message" in error && typeof error.message === "string"
          ? error.message
          : JSON.stringify(error);
      await db.insert(emailLog).values({
        toEmail: params.to,
        kind: params.kind,
        eventId: params.eventId ?? null,
        companyId: params.companyId ?? null,
        subject: params.subject,
        status: "failed",
        errorMessage: errMsg,
        sentAt: null,
      });
      return { ok: false, error: errMsg };
    }
    await db.insert(emailLog).values({
      toEmail: params.to,
      kind: params.kind,
      eventId: params.eventId ?? null,
      companyId: params.companyId ?? null,
      resendMessageId: data?.id ?? null,
      subject: params.subject,
      status: "sent",
      sentAt: new Date(),
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.insert(emailLog).values({
      toEmail: params.to,
      kind: params.kind,
      eventId: params.eventId ?? null,
      companyId: params.companyId ?? null,
      subject: params.subject,
      status: "failed",
      errorMessage: msg,
      sentAt: null,
    });
    return { ok: false, error: msg };
  }
}
