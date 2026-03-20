import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedGridProps {
  className?: string;
  numSquares?: number;
  maxOpacity?: number;
  duration?: number;
  color?: string;
}

export function AnimatedGrid({
  className,
  numSquares = 30,
  maxOpacity = 0.15,
  duration = 3,
  color = "255, 255, 255",
}: AnimatedGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const squaresRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const squares = squaresRef.current;
    if (squares.length === 0) return;

    function animateSquare(square: HTMLDivElement) {
      const delay = Math.random() * duration * 1000;
      const fadeDuration = (duration * 1000) / 2;

      setTimeout(() => {
        square.style.transition = `opacity ${fadeDuration}ms ease-in-out`;
        square.style.opacity = String(Math.random() * maxOpacity);

        setTimeout(() => {
          square.style.opacity = "0";
          setTimeout(() => animateSquare(square), fadeDuration + Math.random() * 1000);
        }, fadeDuration);
      }, delay);
    }

    squares.forEach(animateSquare);
  }, [duration, maxOpacity]);

  return (
    <div ref={containerRef} className={cn("absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
          gridTemplateRows: "repeat(auto-fill, minmax(40px, 1fr))",
        }}
      >
        {Array.from({ length: numSquares }).map((_, i) => (
          <div
            key={i}
            ref={(el) => { if (el) squaresRef.current[i] = el; }}
            className="border border-white/[0.04]"
            style={{
              opacity: 0,
              backgroundColor: `rgba(${color}, 0.1)`,
              gridColumn: `${Math.floor(Math.random() * 20) + 1}`,
              gridRow: `${Math.floor(Math.random() * 20) + 1}`,
            }}
          />
        ))}
      </div>
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={`rgba(${color}, 0.04)`} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}
