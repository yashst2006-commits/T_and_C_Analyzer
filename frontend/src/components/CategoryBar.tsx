interface CategoryBarProps {
  name: string;
  score: number;
  weight: number;
}

export function CategoryBar({ name, score }: CategoryBarProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs font-semibold tracking-wider w-44 shrink-0 uppercase">
        {name}
      </span>
      <div className="flex-1 h-3 bg-secondary border relative overflow-hidden">
        <div
          className={`h-full transition-all duration-700 ${
            score < 40 ? "bg-risk-high" : score < 60 ? "bg-risk-medium" : "bg-risk-low"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="font-mono-clause text-xs font-semibold w-10 text-right">{score}</span>
    </div>
  );
}
