interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}

export function StatCard({ label, value, hint, className }: StatCardProps) {
  return (
    <article className={`stat-card ${className ?? ""}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}
