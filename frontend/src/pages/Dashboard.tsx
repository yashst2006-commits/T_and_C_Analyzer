import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { AnalysisResult } from "@/lib/analysis-schema";
import { FairnessScore } from "@/components/FairnessScore";
import { ClauseCard } from "@/components/ClauseCard";
import { CategoryBar } from "@/components/CategoryBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { askQuestion } from "@/lib/analysis-api";
import { AlertTriangle, FileText, ShieldAlert } from "lucide-react";

interface DashboardProps {
  hasAnalysis: boolean;
  analysis: AnalysisResult | null;
}

interface ChatEntry {
  question: string;
  answer: string;
}

export default function Dashboard({ hasAnalysis, analysis }: DashboardProps) {
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuestion("");
    setChatHistory([]);
  }, [analysis?.serviceName]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  if (!hasAnalysis || !analysis) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center text-gray-500">
          <p className="text-lg">No Terms and Conditions are analyzed.</p>
          <p className="mt-2 text-sm">
            Paste or upload a Terms & Conditions document from the Analyze page to see results.
          </p>
        </div>
      </div>
    );
  }

  const data = analysis;

  const handleAsk = async () => {
    try {
      const trimmedQuestion = question.trim();
      if (!trimmedQuestion) {
        return;
      }

      setIsAsking(true);
      const answer = await askQuestion(trimmedQuestion);
      setChatHistory((current) => [...current, { question: trimmedQuestion, answer }]);
      setQuestion("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown question error";
      toast({
        title: "Question failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8"
        >
          <span className="text-[11px] font-bold tracking-widest text-muted-foreground">
            ANALYSIS REPORT
          </span>
          <h1 className="text-2xl font-black tracking-tight mt-1">
            {data.serviceName} — Terms of Service
          </h1>
        </motion.div>

        {/* Top grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border mb-8">
          {/* Score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 lg:border-r"
          >
            <FairnessScore score={data.fairnessScore} verdict={data.verdict} />
          </motion.div>

          {/* Risk counts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 lg:border-r border-t lg:border-t-0"
          >
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground block mb-4">
              CLAUSE BREAKDOWN
            </span>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-risk-high" />
                  <span className="text-xs font-semibold tracking-wider">HIGH RISK</span>
                </div>
                <span className="font-mono-clause text-2xl font-black text-risk-high">{data.highRiskCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-risk-medium" />
                  <span className="text-xs font-semibold tracking-wider">MEDIUM RISK</span>
                </div>
                <span className="font-mono-clause text-2xl font-black text-risk-medium">{data.mediumRiskCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-risk-low" />
                  <span className="text-xs font-semibold tracking-wider">LOW RISK</span>
                </div>
                <span className="font-mono-clause text-2xl font-black text-risk-low">{data.lowRiskCount}</span>
              </div>
            </div>
          </motion.div>

          {/* Category scores */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 border-t lg:border-t-0"
          >
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground block mb-4">
              WEIGHTED CRITERIA
            </span>
            <div className="space-y-3">
              {data.categories.map((cat) => (
                <CategoryBar key={cat.name} {...cat} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Backend insights */}
        {(data.summary || (data.risks && data.risks.length > 0)) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="border mb-8"
          >
            <div className="px-4 py-3 border-b bg-secondary/30">
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground">
                AI SUMMARY
              </span>
            </div>
            <div className="p-6 space-y-4">
              {data.summary && (
                <p className="text-sm leading-relaxed">{data.summary}</p>
              )}
              {data.risks && data.risks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.risks.map((risk) => (
                    <span
                      key={risk}
                      className="px-2 py-1 text-[10px] font-bold tracking-wider border bg-secondary/50"
                    >
                      {risk.toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="border rounded-lg bg-card mb-8"
        >
          <div className="px-4 py-3 border-b bg-secondary/30 rounded-t-lg">
            <h2 className="text-sm font-semibold text-foreground">
              Ask Questions About This Document
            </h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask a question about the Terms & Conditions..."
                className="bg-background"
              />
              <Button
                onClick={handleAsk}
                disabled={isAsking || !question.trim()}
                className="text-xs font-bold tracking-widest sm:min-w-24"
              >
                {isAsking ? "ASKING..." : "ASK"}
              </Button>
            </div>

            <div className="mt-6 max-h-80 space-y-4 overflow-y-auto rounded-lg border bg-gray-50 p-4">
              {chatHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ask a question to start exploring this document.
                </p>
              ) : (
                chatHistory.map((entry, index) => (
                  <div key={`${entry.question}-${index}`} className="rounded-lg border bg-background p-4">
                    <p className="text-xs font-bold tracking-widest text-muted-foreground">USER</p>
                    <p className="mt-2 text-sm font-semibold">{entry.question}</p>
                    <p className="mt-4 text-xs font-bold tracking-widest text-muted-foreground">AI</p>
                    <p className="mt-2 text-sm leading-relaxed">{entry.answer}</p>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        </motion.div>

        {/* Clauses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="border">
            <div className="px-4 py-3 border-b bg-secondary/30">
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground">
                ALL CLAUSES — {data.totalClauses} FOUND
              </span>
            </div>
            {data.clauses.map((clause) => (
              <ClauseCard key={clause.id} clause={clause} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
