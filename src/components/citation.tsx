import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Fragment } from "react";
import { ExternalLink, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/mock-data";

function CitationBody({ citation }: { citation: Citation }) {
  if (citation.isPractitionerKnowledge) {
    return (
      <div className="space-y-1.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <UserCheck className="size-3.5 text-primary" />
          Collective Impact practitioner guidance
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {citation.documentTitle}. Recorded {citation.date}, {citation.page}.
        </p>
        <p className="text-[11px] text-muted-foreground/80">
          No public document exists for this claim.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold leading-snug text-foreground">
        {citation.documentTitle}.
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {citation.issuingBody}, {citation.date}, {citation.page}.
      </p>
      {citation.url && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-primary">
          <ExternalLink className="size-3" />
          Open source in a new tab
        </p>
      )}
    </div>
  );
}

export function CitationMarker({
  citation,
  className,
}: {
  citation: Citation;
  className?: string;
}) {
  const isLink = Boolean(citation.url) && !citation.isPractitionerKnowledge;

  return (
    <HoverCard openDelay={80} closeDelay={120}>
      <HoverCardTrigger asChild>
        <span
          tabIndex={0}
          role="button"
          className={cn(
            "inline-flex h-4 min-w-4 cursor-pointer items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none transition-all duration-150",
            "bg-primary/10 text-primary ring-1 ring-primary/25",
            "hover:bg-primary hover:text-primary-foreground hover:ring-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
          aria-label={
            citation.isPractitionerKnowledge
              ? `Citation ${citation.number}: Collective Impact practitioner guidance`
              : `Citation ${citation.number}: ${citation.documentTitle}`
          }
        >
          {citation.number}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        className={cn(
          "w-80 p-3",
          isLink && "transition-colors hover:border-primary/40 hover:bg-primary/5",
        )}
        side="top"
        align="center"
        sideOffset={6}
      >
        {isLink ? (
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CitationBody citation={citation} />
          </a>
        ) : (
          <CitationBody citation={citation} />
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

export function CitationText({
  text,
  citations,
  className,
}: {
  text: string;
  citations?: Citation[];
  className?: string;
}) {
  const lookup = new Map((citations ?? []).map((c) => [c.number, c]));
  const parts = text.split(/(\[\d+\])/g);

  return (
    <span className={cn("block", className)}>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          const citation = lookup.get(num);
          if (citation) {
            return (
              <Fragment key={`${i}-${num}`}>
                <CitationMarker citation={citation} className="mx-0.5 align-super" />
              </Fragment>
            );
          }
          return <Fragment key={i} />;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </span>
  );
}

export function stripCitations(text: string) {
  return text.replace(/\[\d+\]/g, "").replace(/\s+([.,;])/g, "$1").trim();
}
