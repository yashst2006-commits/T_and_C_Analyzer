import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { analyzeTerms, type AnalyzeMode } from "@/lib/analysis-api";
import type { AnalysisResult } from "@/lib/analysis-schema";

type InputMode = AnalyzeMode;

interface InputPanelProps {
  onAnalysisComplete: (analysis: AnalysisResult) => void;
}

export function InputPanel({ onAnalysisComplete }: InputPanelProps) {
  const [activeTab, setActiveTab] = useState<InputMode>("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const navigate = useNavigate();

  const modes: { key: InputMode; label: string; icon: React.ReactNode }[] = [
    { key: "paste", label: "PASTE TEXT", icon: <ClipboardPaste className="h-4 w-4" /> },
    { key: "upload", label: "UPLOAD FILE", icon: <FileText className="h-4 w-4" /> },
  ];

  const handleAnalyze = async () => {
    try {
      if (activeTab === "paste" && !text.trim()) {
        setValidationMessage("Please paste Terms & Conditions text before analyzing.");
        return;
      }
      if (activeTab === "upload") {
        if (!file) {
          setValidationMessage("Please upload a Terms & Conditions document.");
          return;
        }
        if (!file.name.toLowerCase().endsWith(".pdf")) {
          toast({
            title: "Only .pdf supported",
            description: "Upload a PDF document to analyze and ask questions about it.",
            variant: "destructive",
          });
          return;
        }
      }

      setValidationMessage("");
      setIsLoading(true);

      const analysis = await analyzeTerms({
        mode: activeTab,
        text: activeTab === "paste" ? text : undefined,
        file: activeTab === "upload" ? file ?? undefined : undefined,
        fileName: activeTab === "upload" ? file?.name : undefined,
      });

      onAnalysisComplete(analysis);
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown analysis error";
      toast({
        title: "Analysis failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border bg-card">
      {/* Mode tabs */}
      <div className="flex border-b">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => {
              setActiveTab(m.key);
              setValidationMessage("");
            }}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold tracking-wider transition-colors border-r last:border-r-0 ${
              activeTab === m.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === "paste" && (
          <Textarea
            value={text}
            onChange={(e) => {
              const nextText = e.target.value;
              setText(nextText);
              if (nextText.trim()) {
                setValidationMessage("");
              }
            }}
            placeholder="Paste the Terms & Conditions text here..."
            className="min-h-[200px] font-serif-legal text-sm leading-relaxed bg-background border resize-none focus-visible:ring-1 focus-visible:ring-foreground"
          />
        )}

        {activeTab === "upload" && (
          <label className="flex flex-col items-center justify-center h-[200px] border-2 border-dashed cursor-pointer hover:border-foreground transition-colors">
            <FileText className="h-8 w-8 text-muted-foreground mb-3" />
            <span className="text-xs font-semibold tracking-wider text-muted-foreground">
              DROP FILE OR CLICK TO UPLOAD
            </span>
            <span className="text-[11px] text-muted-foreground mt-1">
              Upload a PDF document to analyze and use for Q&A.
            </span>
            {file && (
              <span className="mt-2 text-[11px] text-foreground">{file.name}</span>
            )}
            <input
              type="file"
              className="hidden"
              accept=".pdf"
              onChange={(e) => {
                const nextFile = e.target.files?.[0] ?? null;
                setFile(nextFile);
                if (nextFile) {
                  setValidationMessage("");
                }
              }}
            />
          </label>
        )}

        {validationMessage && (
          <div className="text-red-500 text-sm mt-2">
            {validationMessage}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="px-8 text-xs font-bold tracking-widest"
          >
            {isLoading
              ? activeTab === "upload"
                ? "UPLOADING..."
                : "ANALYZING..."
              : activeTab === "upload"
                ? "UPLOAD FILE →"
                : "ANALYZE TERMS →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
