import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  shimmerColor?: string;
  shimmerSize?: string;
  background?: string;
}

export function ShimmerButton({
  children,
  className,
  shimmerColor = "rgba(255, 255, 255, 0.15)",
  shimmerSize = "0.1em",
  background = "rgba(255, 255, 255, 1)",
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        "group relative overflow-hidden px-6 py-3 text-[13px] font-medium transition-all",
        className,
      )}
      style={{ background }}
      {...props}
    >
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          mask: "linear-gradient(#fff, #fff) content-box, linear-gradient(#fff, #fff)",
          WebkitMask: "linear-gradient(#fff, #fff) content-box, linear-gradient(#fff, #fff)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          padding: shimmerSize,
        }}
      >
        <div
          className="absolute inset-0 animate-shimmer"
          style={{
            background: `conic-gradient(from 0deg, transparent 0%, ${shimmerColor} 10%, transparent 20%)`,
            animationDuration: "3s",
          }}
        />
      </div>
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}
