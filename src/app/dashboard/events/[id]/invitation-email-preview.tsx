"use client";

import type { ReactNode } from "react";

import {
  segmentLineForUrls,
  splitInvitationBodyParagraphs,
} from "@/lib/invitation-body-segments";

function lineToPreviewNodes(line: string, keyPrefix: string): ReactNode[] {
  return segmentLineForUrls(line).map((s, i) => {
    const k = `${keyPrefix}-${i}`;
    if (s.kind === "link") {
      return (
        <a
          key={k}
          href={s.href}
          className="text-teal-700 underline dark:text-teal-400"
          target="_blank"
          rel="noreferrer"
        >
          {s.href}
        </a>
      );
    }
    return <span key={k}>{s.text}</span>;
  });
}

export function InvitationEmailPreview(props: {
  companyName: string;
  bodyPlain: string;
}) {
  const paragraphs = splitInvitationBodyParagraphs(props.bodyPlain);

  return (
    <div className="rounded-lg border bg-white text-sm shadow-sm dark:bg-card">
      <div className="border-b px-4 py-3">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {props.companyName}
        </p>
        <p className="mt-1 font-semibold text-base text-foreground">
          {props.companyName}
        </p>
        <p className="text-muted-foreground text-xs">Audio guest book</p>
      </div>
      <div className="space-y-3 px-4 py-4 text-foreground">
        {paragraphs.length === 0 ? (
          <p className="text-muted-foreground">(empty)</p>
        ) : (
          paragraphs.map((para, pi) => (
            <div key={pi} className="space-y-1 text-[15px] leading-relaxed">
              {para.split("\n").map((line, li) => (
                <p key={`${pi}-${li}`} className="whitespace-pre-wrap">
                  {lineToPreviewNodes(line, `p${pi}-l${li}`)}
                </p>
              ))}
            </div>
          ))
        )}
      </div>
      <div className="border-t px-4 py-3 text-muted-foreground text-xs">
        Sent via Audio Guest Books for {props.companyName}.
      </div>
    </div>
  );
}
