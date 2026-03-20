import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface HyperTextProps {
  text: string;
  className?: string;
  duration?: number;
  delay?: number;
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function HyperText({ text, className, duration = 800, delay = 0 }: HyperTextProps) {
  const [display, setDisplay] = useState(text);
  const iterationRef = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      iterationRef.current = 0;
      const interval = setInterval(() => {
        setDisplay((prev) =>
          text
            .split("")
            .map((char, i) => {
              if (char === " ") return " ";
              if (i < iterationRef.current) return text[i];
              return CHARS[Math.floor(Math.random() * CHARS.length)];
            })
            .join(""),
        );
        iterationRef.current += 1 / 3;
        if (iterationRef.current >= text.length) {
          clearInterval(interval);
          setDisplay(text);
        }
      }, duration / (text.length * 3));
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, duration, delay]);

  return <span className={cn("inline-block", className)}>{display}</span>;
}
