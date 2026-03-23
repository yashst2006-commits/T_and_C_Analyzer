import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Clause } from "@/lib/mock-data";
import { RiskBadge } from "./RiskBadge";
import { ChevronDown } from "lucide-react";

export function ClauseCard({ clause }: { clause: Clause }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-4 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono-clause text-[11px] text-muted-foreground">
                [{clause.number}]
              </span>
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {clause.category}
              </span>
              <RiskBadge level={clause.riskLevel} />
            </div>
            <p className="text-sm font-medium leading-relaxed line-clamp-2">
              {clause.simplifiedText}
            </p>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform mt-1 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 border-t">
              {/* Left: Original */}
              <div className="p-4 md:border-r">
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground block mb-2">
                  ORIGINAL TEXT
                </span>
                <p className="font-serif-legal text-sm leading-relaxed text-muted-foreground">
                  "{clause.originalText}"
                </p>
              </div>
              {/* Right: Explanation */}
              <div className="p-4 border-t md:border-t-0">
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground block mb-2">
                  WHAT THIS MEANS
                </span>
                <p className="text-sm leading-relaxed">
                  {clause.explanation}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
