import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/mock-data";

export function CitationMarker({
  citation,
  className,
}: {
  citation: Citation;
  className?: string;
}) {
  const body = citation.isPractitionerKnowledge ? (
    <div className="space-y-1">
      <p className="text-xs font-medium text-foreground">Collective Impact practitioner guidance</p>
      <p className="text-xs text-muted-foreground">
        {citation.documentTitle} — {citation.page}
      </p>
      <p className="text-xs text-muted-foreground">Recorded {citation.date}</p>
    </div>
  ) : (
    <div className="space-y-1">
      <p className="text-xs font-medium text-foreground">{citation.documentTitle}</p>
      <p className="text-xs text-muted-foreground">
        {citation.issuingBody}, {citation.date}, {citation.page}
      </p>
      {citation.url && (
        <p className="break-all text-xs text-primary">{citation.url}</p>
      )}
    </div>
  );

  const trigger = (
    <span
      className={cn(
        "inline-flex h-4 min-w-4 cursor-pointer items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-semibold leading-none text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/20",
        className,
      )}
      aria-label={`Citation ${citation.number}`}
    >
      {citation.number}
    </span>
  );

  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent className="w-72" side="top" align="center">
        {citation.url && !citation.isPractitionerKnowledge ? (
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring"
          >
            {body}
          </a>
        ) : (
          body
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
