import { z } from "zod";
import { analysisResultSchema, type AnalysisResult, type Category, type RiskLevel } from "@/lib/analysis-schema";

export type AnalyzeMode = "paste" | "upload";

export interface AnalyzeRequest {
  mode: AnalyzeMode;
  text?: string;
  file?: File;
  fileName?: string;
}

const CATEGORY_WEIGHTS: Array<{ name: Category["name"]; weight: number; baseScore: number }> = [
  { name: "Data Privacy", weight: 0.25, baseScore: 80 },
  { name: "User Rights", weight: 0.2, baseScore: 78 },
  { name: "Company Liability", weight: 0.2, baseScore: 80 },
  { name: "Subscription Transparency", weight: 0.15, baseScore: 75 },
  { name: "Dispute Resolution", weight: 0.2, baseScore: 80 },
];

const RISK_LEVEL_MAP: Record<string, RiskLevel> = {
  "data sharing": "high",
  "no liability": "high",
  "arbitration clause": "high",
  "data collection": "medium",
  "account termination": "medium",
  "low risk": "low",
};

const RISK_CATEGORY_PENALTIES: Record<string, Partial<Record<Category["name"], number>>> = {
  "data collection": { "Data Privacy": 15 },
  "data sharing": { "Data Privacy": 22, "User Rights": 6 },
  "no liability": { "Company Liability": 28, "User Rights": 8 },
  "account termination": { "User Rights": 18 },
  "arbitration clause": { "Dispute Resolution": 25, "User Rights": 8 },
};

const backendClauseSchema = z.object({
  text: z.string(),
  risk: z.string(),
  model_label: z.string().nullable().optional(),
  model_score: z.number().nullable().optional(),
});

const backendAnalyzeSchema = z.object({
  clauses: z.array(backendClauseSchema),
  risks: z.array(z.string()),
  score: z.number(),
  summary: z.string(),
});

type BackendAnalyzeResponse = z.infer<typeof backendAnalyzeSchema>;
const askResponseSchema = z.object({
  answer: z.string(),
});
const API_BASE = "https://t-and-c-analyzer-backend.onrender.com";

function normalizeApiError(error: unknown): Error {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return new Error("Cannot connect to the analysis server. Please ensure the backend is running.");
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Cannot connect to the analysis server. Please ensure the backend is running.");
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function deriveVerdict(score: number): string {
  if (score < 30) return "Very Unfair";
  if (score < 45) return "Unfair";
  if (score < 60) return "Mixed";
  if (score < 75) return "Mostly Fair";
  return "Fair";
}

function classifyRiskLevel(riskLabel: string, modelScore: number | null | undefined): RiskLevel {
  const normalized = riskLabel.trim().toLowerCase();
  const mapped = RISK_LEVEL_MAP[normalized];
  if (mapped) return mapped;

  if (typeof modelScore === "number") {
    if (modelScore >= 0.85) return "high";
    if (modelScore >= 0.65) return "medium";
  }

  return "low";
}

function summarizeClause(riskLabel: string, text: string): string {
  const snippet = text.slice(0, 220).trim();
  if (!snippet) return `Potential issue detected: ${riskLabel}.`;
  return snippet.length === text.length ? snippet : `${snippet}...`;
}

function explainClause(riskLabel: string, modelLabel: string | null | undefined, modelScore: number | null | undefined): string {
  const details: string[] = [`Detected risk category: ${riskLabel}.`];
  if (modelLabel) {
    const scorePart = typeof modelScore === "number" ? ` (${Math.round(modelScore * 100)}% confidence)` : "";
    details.push(`Model label: ${modelLabel}${scorePart}.`);
  }
  return details.join(" ");
}

function buildCategoryScores(riskLabels: string[]): AnalysisResult["categories"] {
  const scores = new Map<Category["name"], number>();
  for (const entry of CATEGORY_WEIGHTS) {
    scores.set(entry.name, entry.baseScore);
  }

  for (const rawRisk of riskLabels) {
    const normalizedRisk = rawRisk.trim().toLowerCase();
    const penalties = RISK_CATEGORY_PENALTIES[normalizedRisk];
    if (!penalties) continue;

    for (const [name, penalty] of Object.entries(penalties)) {
      const categoryName = name as Category["name"];
      const currentScore = scores.get(categoryName);
      if (typeof currentScore !== "number") continue;
      scores.set(categoryName, clampScore(currentScore - penalty));
    }
  }

  return CATEGORY_WEIGHTS.map((entry) => ({
    name: entry.name,
    weight: entry.weight,
    score: scores.get(entry.name) ?? entry.baseScore,
  }));
}

function deriveServiceName(payload: AnalyzeRequest): string {
  if (payload.mode === "upload" && payload.fileName) {
    return payload.fileName.replace(/\.[^.]+$/, "") || "Uploaded Terms";
  }

  return "Provided Terms";
}

function normalizeBackendResult(raw: BackendAnalyzeResponse, payload: AnalyzeRequest): AnalysisResult {
  const fairnessScore = clampScore(raw.score);

  const clauses = raw.clauses.map((clause, index) => {
    const riskLevel = classifyRiskLevel(clause.risk, clause.model_score);
    return {
      id: `c${index + 1}`,
      number: `${index + 1}`,
      originalText: clause.text,
      simplifiedText: summarizeClause(clause.risk, clause.text),
      explanation: explainClause(clause.risk, clause.model_label, clause.model_score),
      riskLevel,
      category: clause.risk || "General",
    };
  });

  const counts = clauses.reduce(
    (acc, clause) => {
      if (clause.riskLevel === "high") acc.high += 1;
      else if (clause.riskLevel === "medium") acc.medium += 1;
      else acc.low += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );

  const normalized: AnalysisResult = {
    serviceName: deriveServiceName(payload),
    fairnessScore,
    verdict: deriveVerdict(fairnessScore),
    totalClauses: clauses.length,
    highRiskCount: counts.high,
    mediumRiskCount: counts.medium,
    lowRiskCount: counts.low,
    clauses,
    categories: buildCategoryScores(raw.risks),
    summary: raw.summary,
    risks: raw.risks,
  };

  return analysisResultSchema.parse(normalized);
}

export async function analyzeTerms(payload: AnalyzeRequest): Promise<AnalysisResult> {
  try {
    let response: Response;

    if (payload.mode === "paste") {
      const text = payload.text?.trim();
      if (!text) {
        throw new Error("Paste Terms text before analyzing.");
      }

      response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
    } else {
      if (!payload.file) {
        throw new Error("Upload a PDF before analyzing.");
      }

      const formData = new FormData();
      formData.append("file", payload.file);

      response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });
    }

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        (body &&
          typeof body === "object" &&
          "detail" in body &&
          typeof body.detail === "string" &&
          body.detail) ||
        (body &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string" &&
          body.error) ||
        "Server error";
      throw new Error(message);
    }

    const parsed = backendAnalyzeSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error("Invalid backend response format");
    }

    return normalizeBackendResult(parsed.data, payload);
  } catch (error) {
    console.error("API error:", error);
    throw normalizeApiError(error);
  }
}

export async function askQuestion(question: string): Promise<string> {
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion) {
    throw new Error("Question must not be empty.");
  }

  try {
    const response = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: normalizedQuestion }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        (body &&
          typeof body === "object" &&
          "detail" in body &&
          typeof body.detail === "string" &&
          body.detail) ||
        "Question failed";
      throw new Error(message);
    }

    const parsed = askResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error("Invalid question response format");
    }

    return parsed.data.answer;
  } catch (error) {
    console.error("API error:", error);
    throw normalizeApiError(error);
  }
}
