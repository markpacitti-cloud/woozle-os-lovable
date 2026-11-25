import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatText, toExternalHref } from "@/lib/format";
import type { PersonListItem } from "@/lib/types";

interface PersonOverviewTabProps {
  person: PersonListItem;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[160px_1fr] sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function PersonOverviewTab({ person }: PersonOverviewTabProps) {
  const linkedinHref = toExternalHref(person.linkedin_url);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
      <section className="rounded-lg border border-border bg-background p-4">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Details
        </h2>
        <dl className="mt-2 divide-y divide-row-divider">
          <FieldRow label="Full name">{formatText(person.full_name)}</FieldRow>
          <FieldRow label="First name">{formatText(person.first_name)}</FieldRow>
          <FieldRow label="Last name">{formatText(person.last_name)}</FieldRow>
          <FieldRow label="Current role">{formatText(person.primary_title)}</FieldRow>
          <FieldRow label="Current company">
            {person.primary_company_name ? (
              person.primary_company_id ? (
                <Link
                  to="/companies/$companyId"
                  params={{ companyId: person.primary_company_id }}
                  className="font-medium text-link hover:underline"
                >
                  {person.primary_company_name}
                </Link>
              ) : (
                person.primary_company_name
              )
            ) : (
              "—"
            )}
          </FieldRow>
          <FieldRow label="Primary email">
            {person.primary_email ? (
              <div className="flex flex-wrap items-center gap-2">
                <a href={`mailto:${person.primary_email}`} className="text-link hover:underline">
                  {person.primary_email}
                </a>
                {person.primary_email_status ? (
                  <Badge variant={person.primary_email_status === "active" ? "green" : "grey"}>
                    {person.primary_email_status}
                  </Badge>
                ) : null}
              </div>
            ) : (
              "—"
            )}
          </FieldRow>
          <FieldRow label="Phone">
            {person.phone ? (
              <a href={`tel:${person.phone}`} className="text-link hover:underline">
                {person.phone}
              </a>
            ) : (
              "—"
            )}
          </FieldRow>
          <FieldRow label="LinkedIn">
            {linkedinHref ? (
              <a
                href={linkedinHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-link hover:underline"
              >
                <span className="truncate">{person.linkedin_url}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              "—"
            )}
          </FieldRow>
          <FieldRow label="Source">{formatText(person.source)}</FieldRow>
        </dl>
      </section>

      <aside className="self-start rounded-lg border border-border bg-surface-subtle p-4">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Record info
        </h2>
        <dl className="mt-3 space-y-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Last activity</dt>
            <dd className="mt-0.5 text-foreground">{formatDateTime(person.last_activity_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd className="mt-0.5 text-foreground">{formatDateTime(person.created_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Updated</dt>
            <dd className="mt-0.5 text-foreground">{formatDateTime(person.updated_at)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}