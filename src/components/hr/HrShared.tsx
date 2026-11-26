import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, FileText, LockKeyhole } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { formatHrStatus } from "@/lib/hr";
import { api } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const DRAFT_LINE = "> **DRAFT – NOT LEGALLY REVIEWED**";

export function HrPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { handleApiError } = useAuth();
  const redirectQuery = useQuery({
    queryKey: ["hr-setting", "hr.email_redirect_to"],
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_settings")
        .select("key,value")
        .eq("key", "hr.email_redirect_to")
        .maybeSingle();
      if (error) {
        handleApiError(error);
        throw error;
      }
      const value = data?.value;
      return typeof value === "string" ? value : null;
    },
  });

  return (
    <div className="min-h-full bg-background">
      {redirectQuery.data ? (
        <div className="border-b border-tag-orange bg-tag-orange px-5 py-2 text-xs text-tag-orange-foreground">
          Staging: all HR email goes to {redirectQuery.data}
        </div>
      ) : null}
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description ? (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export function HrStatusBadge({ status }: { status: string }) {
  const normalised = status.toLowerCase();
  const variant = ["completed", "accepted", "published", "open"].includes(normalised)
    ? "green"
    : ["declined", "cancelled", "failed", "overdue"].includes(normalised)
      ? "red"
      : ["awaiting_approval", "on_hold", "waiting_for_esign", "queued"].includes(normalised)
        ? "orange"
        : ["sent", "viewed", "draft"].includes(normalised)
          ? "blue"
          : "grey";
  return <Badge variant={variant}>{formatHrStatus(status)}</Badge>;
}

export function HrEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-subtle text-muted-foreground">
        <FileText className="h-4 w-4" />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function HrError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center">
      <AlertCircle className="h-5 w-5 text-destructive" />
      <p className="mt-3 text-sm font-medium text-foreground">Could not load this HR information</p>
      <p className="mt-1 max-w-lg text-xs text-muted-foreground">{message}</p>
      {retry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={retry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function HrPermissionMessage({ area }: { area: string }) {
  return (
    <div className="p-6">
      <LockKeyhole className="h-5 w-5 text-muted-foreground" />
      <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{area}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You don&apos;t have permission to view this HR page.
      </p>
    </div>
  );
}

export function HrLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5" aria-label="Loading HR information">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function HrMarkdown({ body, className }: { body: string; className?: string }) {
  const hasDraftWarning = body.trimStart().startsWith(DRAFT_LINE);
  const cleanBody = hasDraftWarning ? body.trimStart().slice(DRAFT_LINE.length).trimStart() : body;
  return (
    <div className={className}>
      {hasDraftWarning ? (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/30 bg-tag-red px-3 py-2 text-xs font-semibold text-tag-red-foreground"
        >
          DRAFT – NOT LEGALLY REVIEWED
        </div>
      ) : null}
      <div className="woozle-markdown hr-document">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanBody}</ReactMarkdown>
      </div>
    </div>
  );
}

export function HrDetail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm text-foreground">{value || "—"}</dd>
    </div>
  );
}

export function HrSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-background", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
