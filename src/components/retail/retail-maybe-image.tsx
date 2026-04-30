"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

/** Hides itself if the URL fails to load (e.g. expired object, transient R2 issue). */
export function RetailMaybeImage({ src, alt, className }: Props) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn(className)}
      onError={() => setVisible(false)}
    />
  );
}
