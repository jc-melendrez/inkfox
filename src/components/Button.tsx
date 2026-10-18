import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg";
  fullWidth?: boolean;
}

/** Shared class builder so router <Link>s can look like buttons too. */
function btnClass(
  variant: Variant = "secondary",
  extra?: { size?: "md" | "lg"; fullWidth?: boolean; className?: string },
): string {
  return [
    "btn",
    `btn--${variant}`,
    extra?.size === "lg" && "btn--lg",
    extra?.fullWidth && "btn--full",
    extra?.className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "secondary",
  size = "md",
  fullWidth,
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={btnClass(variant, { size, fullWidth, className })}
      {...rest}
    />
  );
}
