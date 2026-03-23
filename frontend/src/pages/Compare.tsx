import { useState } from "react";
import { motion } from "framer-motion";
import { MOCK_COMPARISON } from "@/lib/mock-data";
import { FairnessScore } from "@/components/FairnessScore";
import { CategoryBar } from "@/components/CategoryBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Compare() {
  const [showResults, setShowResults] = useState(false);
  const { a, b } = MOCK_COMPARISON;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span className="text-[11px] font-bold tracking-widest text-muted-foreground">
            COMPARISON MODE
          </span>
          <h1 className="text-2xl font-black tracking-tight mt-1 mb-8">
            Compare Terms Side by Side
          </h1>
        </motion.div>

        {/* Input */}
        {!showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold tracking-widest text-muted-foreground block mb-2">
                  SERVICE A
                </label>
                <Input
                  placeholder="e.g. Instagram"
                  defaultValue="Instagram"
                  className="font-mono-clause text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest text-muted-foreground block mb-2">
                  SERVICE B
                </label>
                <Input
                  placeholder="e.g. TikTok"
                  defaultValue="TikTok"
                  className="font-mono-clause text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setShowResults(true)}
                className="px-8 text-xs font-bold tracking-widest"
              >
                COMPARE →
              </Button>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Scores */}
            <div className="grid grid-cols-2 gap-0 border mb-8">
              <div className="p-6 border-r">
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground block mb-4">
                  {a.serviceName.toUpperCase()}
                </span>
                <FairnessScore score={a.fairnessScore} verdict={a.verdict} size="sm" />
              </div>
              <div className="p-6">
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground block mb-4">
                  {b.serviceName.toUpperCase()}
                </span>
                <FairnessScore score={b.fairnessScore} verdict={b.verdict} size="sm" />
              </div>
            </div>

            {/* Category comparison */}
            <div className="border">
              <div className="px-4 py-3 border-b bg-secondary/30">
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground">
                  CATEGORY COMPARISON
                </span>
              </div>
              <div className="grid grid-cols-2 divide-x">
                <div className="p-6 space-y-3">
                  {a.categories.map((cat) => (
                    <CategoryBar key={cat.name} {...cat} />
                  ))}
                </div>
                <div className="p-6 space-y-3">
                  {b.categories.map((cat) => (
                    <CategoryBar key={cat.name} {...cat} />
                  ))}
                </div>
              </div>
            </div>

            {/* Risk count comparison */}
            <div className="grid grid-cols-2 gap-0 border mt-8">
              {[a, b].map((service, i) => (
                <div key={service.serviceName} className={`p-6 ${i === 0 ? "border-r" : ""}`}>
                  <span className="text-[10px] font-bold tracking-widest text-muted-foreground block mb-4">
                    RISK BREAKDOWN
                  </span>
                  <div className="flex gap-6">
                    <div>
                      <span className="font-mono-clause text-3xl font-black text-risk-high">{service.highRiskCount}</span>
                      <span className="text-[10px] block text-muted-foreground tracking-wider mt-1">HIGH</span>
                    </div>
                    <div>
                      <span className="font-mono-clause text-3xl font-black text-risk-medium">{service.mediumRiskCount}</span>
                      <span className="text-[10px] block text-muted-foreground tracking-wider mt-1">MEDIUM</span>
                    </div>
                    <div>
                      <span className="font-mono-clause text-3xl font-black text-risk-low">{service.lowRiskCount}</span>
                      <span className="text-[10px] block text-muted-foreground tracking-wider mt-1">LOW</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Button
                variant="outline"
                onClick={() => setShowResults(false)}
                className="text-xs font-bold tracking-widest"
              >
                ← NEW COMPARISON
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
