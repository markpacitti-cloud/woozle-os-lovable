import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Globe } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, formatText, toExternalHref } from "@/lib/format";
import { api } from "@/lib/supabase";
import type { CompanyDetail, CompanyDomain } from "@/lib/types";

interface CompanyOverviewTabProps {
  company: CompanyDetail;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[160px_1fr] sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function CompanyOverviewTab({ company }: CompanyOverviewTabProps) {
  const { handleApiError } = useAuth();

  const domainsQuery = useQuery({
    queryKey: ["company-domains", company.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("company_domains")
        .select("domain,root_domain,company_id,company_name,source,notes,created_at")
        .eq("company_id", company.id)
        .order("domain");
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as CompanyDomain[];
    },
  });

  const websiteHref = toExternalHref(company.website);
  const linkedinHref = toExternalHref(company.linkedin_url);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-background p-4">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Details
          </h2>
          <dl className="mt-2 divide-y divide-row-divider">
            <FieldRow label="Description">
              <span className="whitespace-pre-wrap">{formatText(company.description)}</span>
            </FieldRow>
            <FieldRow label="Segment">{formatText(company.segment)}</FieldRow>
            <FieldRow label="Website">
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-link hover:underline"
                >
                  <span className="truncate">{company.website}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : (
                "—"
              )}
            </FieldRow>
            <FieldRow label="Primary domain">{formatText(company.primary_domain)}</FieldRow>
            <FieldRow label="LinkedIn">
              {linkedinHref ? (
                <a
                  href={linkedinHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-link hover:underline"
                >
                  <span className="truncate">{company.linkedin_url}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : (
                "—"
              )}
            </FieldRow>
            <FieldRow label="Employees">
              {company.employee_count !== null || company.employee_range
                ? [
                    company.employee_count !== null
                      ? company.employee_count.toLocaleString("en-GB")
                      : null,
                    company.employee_range ? `(${company.employee_range})` : null,
                  ]
                    .filter(Boolean)
                    .join(" ")
                : "—"}
            </FieldRow>
            <FieldRow label="Source">{formatText(company.source)}</FieldRow>
            <FieldRow label="Notes">
              <span className="whitespace-pre-wrap">{formatText(company.notes)}</span>
            </FieldRow>
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Email domains
            </h2>
            {domainsQuery.data ? (
              <span className="text-xs text-muted-foreground">{domainsQuery.data.length}</span>
            ) : null}
          </div>

          {domainsQuery.isPending ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-32" />
            </div>
          ) : !domainsQuery.data || domainsQuery.data.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No email domains recorded.</p>
          ) : (
            <ul className="mt-3 divide-y divide-row-divider">
              {domainsQuery.data.map((row) => (
                <li key={row.domain} className="flex items-center justify-between gap-2 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium text-foreground">
                      {row.domain}
                    </span>
                    {row.source ? <Badge variant="grey">{row.source}</Badge> : null}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(row.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="rounded-lg border border-border bg-surface-subtle p-4 self-start">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Record info
        </h2>
        <dl className="mt-3 space-y-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Owner</dt>
            <dd className="mt-0.5 font-medium text-foreground">{formatText(company.owner_name)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last activity</dt>
            <dd className="mt-0.5 text-foreground">{formatDateTime(company.last_activity_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd className="mt-0.5 text-foreground">{formatDateTime(company.created_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Updated</dt>
            <dd className="mt-0.5 text-foreground">{formatDateTime(company.updated_at)}</dd>
          </div>
          {company.archived_at ? (
            <div>
              <dt className="text-muted-foreground">Archived</dt>
              <dd className="mt-0.5 text-destructive">{formatDateTime(company.archived_at)}</dd>
            </div>
          ) : null}
        </dl>
      </aside>
    </div>
  );
}