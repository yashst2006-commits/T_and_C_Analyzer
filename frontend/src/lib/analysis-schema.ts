import { z } from "zod";

export const riskLevelSchema = z.enum(["high", "medium", "low"]);

export const clauseSchema = z.object({
  id: z.string(),
  number: z.string(),
  originalText: z.string(),
  simplifiedText: z.string(),
  explanation: z.string(),
  riskLevel: riskLevelSchema,
  category: z.string(),
});

export const categorySchema = z.object({
  name: z.string(),
  score: z.number(),
  weight: z.number(),
});

export const analysisResultSchema = z.object({
  serviceName: z.string(),
  fairnessScore: z.number(),
  verdict: z.string(),
  totalClauses: z.number(),
  highRiskCount: z.number(),
  mediumRiskCount: z.number(),
  lowRiskCount: z.number(),
  clauses: z.array(clauseSchema),
  categories: z.array(categorySchema),
  summary: z.string().optional(),
  risks: z.array(z.string()).optional(),
});

export type RiskLevel = z.infer<typeof riskLevelSchema>;
export type Clause = z.infer<typeof clauseSchema>;
export type Category = z.infer<typeof categorySchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
