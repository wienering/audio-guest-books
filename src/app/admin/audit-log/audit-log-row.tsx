"use client";

import Link from "next/link";
import { useState } from "react";

import type { AdminAuditQueryRow } from "@/lib/admin-audit-query";
import { formatDateTime } from "@/lib/date-format";

function fmt(iso: string): string {
  return formatDateTime(iso) || iso;
}

export function AuditLogRow({ row }: { row: AdminAuditQueryRow }) {
  const [open, setOpen] = useState(false);
  const hasMetadata = row.metadata && Object.keys(row.metadata).length > 0;

  return (
    <>
      <tr className="border-b align-top hover:bg-muted/20">
        <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
          {fmt(row.createdAt)}
        </td>
        <td className="px-3 py-2">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold">
            {row.actionType}
          </span>
        </td>
        <td className="px-3 py-2">{row.description}</td>
        <td className="px-3 py-2">
          {row.targetCompanySlug ? (
            <Link
              href={`/admin/companies/${encodeURIComponent(row.targetCompanySlug)}`}
              className="font-mono text-xs text-primary hover:underline"
            >
              {row.targetCompanySlug}
            </Link>
          ) : row.targetUserClerkId ? (
            <span className="font-mono text-xs">{row.targetUserClerkId}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-2 font-mono text-[11px]">
          {row.adminClerkUserId}
        </td>
        <td className="px-3 py-2 text-right">
          {hasMetadata ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {open ? "Hide" : "Show JSON"}
            </button>
          ) : null}
        </td>
      </tr>
      {hasMetadata && open ? (
        <tr className="border-b bg-muted/20">
          <td colSpan={6} className="px-3 py-3">
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded bg-background p-3 font-mono text-[11px] leading-relaxed">
              {JSON.stringify(row.metadata, null, 2)}
            </pre>
          </td>
        </tr>
      ) : null}
    </>
  );
}
