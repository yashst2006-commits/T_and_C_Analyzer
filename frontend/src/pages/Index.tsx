import { InputPanel } from "@/components/InputPanel";
import { Shield, Zap, Eye } from "lucide-react";
import { motion } from "framer-motion";
import type { AnalysisResult } from "@/lib/analysis-schema";

const features = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: "X-RAY ANALYSIS",
    desc: "Decodes legal jargon into plain language you can actually understand.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "RISK DETECTION",
    desc: "Identifies clauses designed to strip your rights, hidden in dense text.",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "FAIRNESS SCORING",
    desc: "Weighted scoring across privacy, liability, and dispute resolution.",
  },
];

interface IndexProps {
  onAnalysisComplete: (analysis: AnalysisResult) => void;
}

export default function Index({ onAnalysisComplete }: IndexProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none mb-4">
            KNOW WHAT YOU'RE<br />AGREEING TO.
          </h1>
          <p className="text-muted-foreground text-base max-w-lg leading-relaxed">
            FairTerms AI strips away corporate legal camouflage. Paste any Terms &
            Conditions and get an instant forensic analysis of what you're really signing up for.
          </p>
        </motion.div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <InputPanel onAnalysisComplete={onAnalysisComplete} />
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border mt-12">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              className={`p-6 ${i < 2 ? "md:border-r" : ""} ${i > 0 ? "border-t md:border-t-0" : ""}`}
            >
              <div className="mb-3">{f.icon}</div>
              <h3 className="text-xs font-bold tracking-widest mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
