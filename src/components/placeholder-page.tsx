import type { LucideIcon } from "lucide-react";

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Workspace</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="flex min-h-72 items-center justify-center border border-dashed bg-muted/20 px-6 text-center">
        <div>
          <span className="mx-auto grid size-10 place-items-center rounded-md border bg-background text-muted-foreground">
            <Icon className="size-5" />
          </span>
          <p className="mt-4 text-sm font-medium text-foreground">Ready for the next build step</p>
          <p className="mt-1 text-sm text-muted-foreground">This workspace is intentionally stubbed for now.</p>
        </div>
      </div>
    </main>
  );
}