import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  color?: string;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 8,
  delay = 0,
  color = "rgba(255,255,255,0.3)",
}: BorderBeamProps) {
  return (
    <div
      className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
    >
      <div
        className="absolute animate-border-beam"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          top: "-50%",
          left: "-50%",
        }}
      />
    </div>
  );
}
