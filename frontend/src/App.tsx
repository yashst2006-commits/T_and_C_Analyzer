import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNav } from "@/components/TopNav";
import type { AnalysisResult } from "@/lib/analysis-schema";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Compare from "./pages/Compare";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const handleAnalysisComplete = (nextAnalysis: AnalysisResult) => {
    setAnalysis(nextAnalysis);
    setHasAnalysis(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <TopNav />
            <Routes>
              <Route path="/" element={<Index onAnalysisComplete={handleAnalysisComplete} />} />
              <Route path="/dashboard" element={<Dashboard hasAnalysis={hasAnalysis} analysis={analysis} />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
