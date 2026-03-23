import { motion } from "framer-motion";

interface FairnessScoreProps {
  score: number;
  verdict: string;
  size?: "lg" | "sm";
}

export function FairnessScore({ score, verdict, size = "lg" }: FairnessScoreProps) {
  const isLg = size === "lg";

  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold tracking-widest text-muted-foreground mb-1">
        FAIRNESS SCORE
      </span>
      <div className="flex items-baseline gap-1">
        <motion.span
          className={`font-black tracking-tight ${isLg ? "text-7xl md:text-8xl" : "text-5xl"}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {score}
        </motion.span>
        <span className={`font-light text-muted-foreground ${isLg ? "text-3xl" : "text-xl"}`}>/100</span>
      </div>
      <span className={`font-mono-clause font-semibold tracking-wider mt-1 ${
        score < 40 ? "text-risk-high" : score < 60 ? "text-risk-medium" : "text-risk-low"
      } ${isLg ? "text-sm" : "text-xs"}`}>
        {verdict.toUpperCase()}
      </span>
    </div>
  );
}
