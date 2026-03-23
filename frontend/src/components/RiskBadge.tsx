import { type RiskLevel } from "@/lib/mock-data";

const config: Record<RiskLevel, { label: string; className: string }> = {
  high: { label: "HIGH RISK", className: "bg-risk-high-bg text-risk-high border-risk-high" },
  medium: { label: "MED RISK", className: "bg-risk-medium-bg text-risk-medium border-risk-medium" },
  low: { label: "LOW RISK", className: "bg-risk-low-bg text-risk-low border-risk-low" },
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const c = config[level];
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider border ${c.className}`}>
      {c.label}
    </span>
  );
}
