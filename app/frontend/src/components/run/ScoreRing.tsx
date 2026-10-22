import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { scoreTone } from "@/lib/score";

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Animated 0-10 score ring: red below 6, amber 6-7, green 8 and up. */
export function ScoreRing({ score, size = 64, className }: { score: number; size?: number; className?: string }) {
  const reduce = useReducedMotion();
  const clamped = Math.min(10, Math.max(0, score));
  const tone = scoreTone(clamped);
  const offset = CIRCUMFERENCE * (1 - clamped / 10);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={10}
      aria-valuenow={clamped}
      aria-valuetext={`Review score ${clamped} out of 10`}
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={RADIUS} fill="none" strokeWidth="6" className="stroke-muted" />
        <motion.circle
          cx="32"
          cy="32"
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          className={tone.stroke}
          initial={{ strokeDashoffset: reduce ? offset : CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center leading-none" aria-hidden>
        <span className="text-center">
          <span className={cn("block font-mono text-lg font-semibold", tone.text)}>{clamped}</span>
          <span className="block text-[10px] text-muted-foreground">/ 10</span>
        </span>
      </div>
    </div>
  );
}
