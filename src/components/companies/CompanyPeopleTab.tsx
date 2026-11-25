import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, formatText, toExternalHref } from "@/lib/format";
import { api } from "@/lib/supabase";
import type { CompanyPerson } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CompanyPeopleTab({ companyId }: { companyId: string }) {
  const { handleApiError } = useAuth();
  const [currentOnly, setCurrentOnly] = useState(false);

  const peopleQuery = useQuery({
    queryKey: ["company-people", companyId, currentOnly],
    queryFn: async () => {
      let req = api
        .from("company_people")
        .select(
          "company_id,role_id,person_id,full_name,title,started_on,ended_on,is_current,is_primary,primary_email,phone,linkedin_url",
        )
        .eq("company_id", companyId)
        .order("is_current", { ascending: false })
        .order("started_on", { ascending: false, nullsFirst: false });

      if (currentOnly) {
        req = req.eq("is_current", true);
      }

      const { data, error } = await req;
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as CompanyPerson[];
    },
  });

  const rows = peopleQuery.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex h-8 items-center rounded-md border border-border bg-surface-subtle p-0.5">
          {(
            [
              { label: "All", value: false },
              { label: "Current only", value: true },
            ] as const
          ).map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setCurrentOnly(opt.value)}
              className={cn(
                "h-7 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
                currentOnly === opt.value
                  ? "bg-background text-foreground ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {!peopleQuery.isPending ? (
          <span className="text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? "person" : "people"}
          </span>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-surface-subtle">
            <tr className="h-9 text-xs font-medium text-muted-foreground">
              <th className="px-4 font-medium">Name</th>
              <th className="px-4 font-medium">Title</th>
              <th className="px-4 font-medium">Status</th>
              <th className="hidden px-4 font-medium md:table-cell">Email</th>
              <th className="hidden px-4 font-medium lg:table-cell">Dates</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-row-divider">
            {peopleQuery.isPending ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="h-[46px]">
                  <td className="px-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="hidden px-4 md:table-cell"><Skeleton className="h-4 w-40" /></td>
                  <td className="hidden px-4 lg:table-cell"><Skeleton className="h-4 w-28" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <Users className="mx-auto h-4 w-4 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium text-foreground">No people linked</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {currentOnly
                      ? "No current roles found for this company."
                      : "No contacts or employment history recorded yet."}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((person) => {
                const linkedinHref = toExternalHref(person.linkedin_url);
                return (
                  <tr key={person.role_id} className="h-[46px] hover:bg-accent/50">
                    <td className="px-4 font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{person.full_name}</span>
                        {linkedinHref ? (
                          <a
                            href={linkedinHref}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`${person.full_name} LinkedIn`}
                            className="text-muted-foreground hover:text-link"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 text-muted-foreground">{formatText(person.title)}</td>
                    <td className="px-4">
                      <Badge variant={person.is_current ? "green" : "grey"}>
                        {person.is_current ? "Current" : "Past"}
                      </Badge>
                    </td>
                    <td className="hidden px-4 text-xs text-muted-foreground md:table-cell">
                      {person.primary_email ? (
                        <a href={`mailto:${person.primary_email}`} className="text-link hover:underline">
                          {person.primary_email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 text-xs text-muted-foreground lg:table-cell">
                      {person.started_on || person.ended_on
                        ? `${formatDate(person.started_on)} – ${person.is_current ? "Present" : formatDate(person.ended_on)}`
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}