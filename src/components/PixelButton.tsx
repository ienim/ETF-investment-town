import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type PixelButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: "primary" | "secondary" | "danger";
};

export function PixelButton({ children, className = "", variant = "primary", ...props }: PixelButtonProps) {
  return (
    <button className={`pixel-button pixel-button--${variant} ${className}`.trim()} {...props}>
      <span className="pixel-button__label">{children}</span>
    </button>
  );
}
