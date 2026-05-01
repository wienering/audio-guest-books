import Image from "next/image";

type BrandLogoProps = {
  variant?: "horizontal" | "horizontal-dark";
  className?: string;
};

/** Official lockups from `/public/brand` (audioguestbooks brand sheet). */
export function BrandLogo({
  variant = "horizontal",
  className = "h-8 w-auto",
}: BrandLogoProps) {
  const src =
    variant === "horizontal-dark"
      ? "/brand/lockup-horizontal-dark.svg"
      : "/brand/lockup-horizontal.svg";
  return (
    <Image
      src={src}
      alt="Audio Guest Books"
      width={520}
      height={80}
      className={className}
      unoptimized
    />
  );
}
