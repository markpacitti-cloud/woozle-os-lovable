import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { HrEmpty, HrError, HrLoading, HrMarkdown, HrPage } from "@/components/hr/HrShared";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/format";
import type { HrMyRequest, HrPolicy } from "@/lib/hr-types";
import { api, getErrorMessage } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function HrPoliciesPage() {
  const { handleApiError } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const policiesQuery = useQuery({
    queryKey: ["hr-policies", debouncedSearch],
    queryFn: async () => {
      let query = api
        .from("hr_policies")
        .select(
          "id,document_key,version,title,category,summary,body,audience,effective_from,review_due,published_at,response_type,is_legal_review_needed",
        );
      if (debouncedSearch) {
        query = query.textSearch("search", debouncedSearch, {
          type: "websearch",
          config: "english",
        });
      }
      const { data, error } = await query.order("title");
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrPolicy[];
    },
  });
  const requestsQuery = useQuery({
    queryKey: ["hr-my-requests", "policy-acknowledgements"],
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_my_requests")
        .select("document_key,status,response,responded_at")
        .order("sent_at", { ascending: false });
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as Pick<
        HrMyRequest,
        "document_key" | "status" | "response" | "responded_at"
      >[];
    },
  });

  const rows = policiesQuery.data ?? [];
  const categories = [
    ...new Set(rows.map((row) => row.category).filter((value): value is string => Boolean(value))),
  ].sort();
  const filtered = category === "all" ? rows : rows.filter((row) => row.category === category);
  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;
  const acknowledged = new Set(
    (requestsQuery.data ?? [])
      .filter((request) => request.status === "completed" && request.response === "acknowledge")
      .map((request) => request.document_key),
  );

  return (
    <HrPage title="Policies" description="Current internal and public policies.">
      <div className="grid min-h-[calc(100vh-130px)] lg:grid-cols-[340px_1fr]">
        <div className="border-b border-border lg:border-r lg:border-b-0">
          <div className="space-y-2 border-b border-border p-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search policies…"
                className="bg-surface-subtle pl-8"
                aria-label="Search policies"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-surface-subtle text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {policiesQuery.isPending ? (
            <HrLoading rows={6} />
          ) : policiesQuery.isError ? (
            <HrError
              message={getErrorMessage(policiesQuery.error)}
              retry={() => void policiesQuery.refetch()}
            />
          ) : filtered.length === 0 ? (
            <HrEmpty title="No policies found" description="Try another search or category." />
          ) : (
            <ul className="divide-y divide-row-divider">
              {filtered.map((policy) => (
                <li key={policy.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(policy.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors hover:bg-accent",
                      selected?.id === policy.id && "bg-nav-active",
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{policy.title}</span>
                      {acknowledged.has(policy.document_key) ? (
                        <Badge variant="green">Acknowledged</Badge>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {policy.category ?? "General"} · v{policy.version}
                    </span>
                    {policy.is_legal_review_needed ? (
                      <span className="mt-1 block text-[11px] font-medium text-tag-red-foreground">
                        Needs legal review
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-5 sm:p-8">
          {selected ? (
            <article className="mx-auto max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="grey">{selected.category ?? "General"}</Badge>
                {acknowledged.has(selected.document_key) ? (
                  <Badge variant="green">Acknowledged</Badge>
                ) : null}
                {selected.is_legal_review_needed ? (
                  <Badge variant="red">Needs legal review</Badge>
                ) : null}
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                {selected.title}
              </h2>
              {selected.summary ? (
                <p className="mt-2 text-sm text-muted-foreground">{selected.summary}</p>
              ) : null}
              <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-border py-4 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Version</dt>
                  <dd className="mt-1 font-medium">{selected.version}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Effective from</dt>
                  <dd className="mt-1 font-medium">{formatDate(selected.effective_from)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Review due</dt>
                  <dd className="mt-1 font-medium">{formatDate(selected.review_due)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Audience</dt>
                  <dd className="mt-1 font-medium">{selected.audience ?? "—"}</dd>
                </div>
              </dl>
              <HrMarkdown body={selected.body} className="mt-6" />
            </article>
          ) : null}
        </div>
      </div>
    </HrPage>
  );
}
