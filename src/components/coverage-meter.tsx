export function CoverageMeter({ value }: { value: number }) {
  const tone = value >= 75 ? "bg-primary" : value >= 45 ? "bg-warning" : "bg-destructive";
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{value}%</span>
    </span>
  );
}
