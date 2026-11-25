import { Check, ExternalLink, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { AiPendingAction } from "@/lib/types";

interface PendingActionCardProps {
  action: AiPendingAction;
  busy: boolean;
  onDecide: (actionId: string, decision: "approve" | "reject") => void;
  onNavigatePath: (path: string) => void;
}

function formatChangeValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export function PendingActionCard({
  action,
  busy,
  onDecide,
  onNavigatePath,
}: PendingActionCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-subtle p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">{action.title}</p>
          {action.record ? (
            <button
              type="button"
              onClick={() => onNavigatePath(action.record!.path)}
              className="mt-0.5 inline-flex items-center gap-1 text-xs text-link hover:underline"
            >
              <span className="truncate">{action.record.name ?? action.record.type}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </button>
          ) : null}
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          Expires {formatDateTime(action.expires_at)}
        </span>
      </div>

      {action.changes.length > 0 ? (
        <div className="mt-2.5 divide-y divide-row-divider rounded-md border border-border bg-background text-xs">
          {action.changes.map((change, idx) => (
            <div key={`${change.field}-${idx}`} className="flex flex-col gap-0.5 px-2.5 py-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">{change.field}</span>
              <div className="flex flex-wrap items-center gap-1.5 text-foreground">
                <span className="text-muted-foreground line-through">
                  {formatChangeValue(change.before)}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{formatChangeValue(change.after)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          className="h-7 flex-1 text-xs"
          disabled={busy}
          onClick={() => onDecide(action.id, "approve")}
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 flex-1 text-xs"
          disabled={busy}
          onClick={() => onDecide(action.id, "reject")}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Reject
        </Button>
      </div>
    </div>
  );
}