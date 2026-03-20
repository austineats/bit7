import { cn } from "@/lib/utils";

interface MeteorsProps {
  number?: number;
  className?: string;
}

export function Meteors({ number = 12, className }: MeteorsProps) {
  const meteors = Array.from({ length: number }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 5;
    const duration = 2 + Math.random() * 3;
    const size = Math.random() * 1 + 0.5;

    return (
      <span
        key={i}
        className={cn(
          "absolute top-0 pointer-events-none animate-meteor",
          className,
        )}
        style={{
          left: `${left}%`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          width: `${size}px`,
          height: `${size * 80}px`,
        }}
      />
    );
  });

  return <>{meteors}</>;
}
