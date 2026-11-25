import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpDown, Building2, Loader2, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, formatText } from "@/lib/format";
import { api } from "@/lib/supabase";
import type { CompanyListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

type OwnerFilter = "all" | "mine" | "unowned";
type SortOption = "last_activity_desc" | "name_asc" | "name_desc" | "created_desc" | "owner_asc";

const SORT_LABELS: Record<SortOption, string> = {
  last_activity_desc: "Last activity",
  name_asc: "Name (A–Z)",
  name_desc: "Name (Z–A)",
  created_desc: "Recently created",
  owner_asc: "Owner (A–Z)",
};

export function CompaniesListPage() {
  const navigate = useNavigate();
  const { profile, access, handleApiError } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [sort, setSort] = useState<SortOption>("last_activity_desc");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const canView = Boolean(!access || access.companies_view || access.is_global_admin);

  const query = useInfiniteQuery({
    queryKey: ["companies", { search: debouncedSearch, ownerFilter, sort, meId: profile?.id }],
    enabled: canView,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let req = api
        .from("companies_list")
        .select(
          "id,name,segment,website,primary_domain,source,created_at,updated_at,owner_staff_id,owner_name,last_activity_at,linkedin_url,description,employee_count,employee_range",
          { count: "exact" },
        );

      if (debouncedSearch) {
        req = req.ilike("name", `%${debouncedSearch}%`);
      }
      if (ownerFilter === "mine" && profile?.id) {
        req = req.eq("owner_staff_id", profile.id);
      } else if (ownerFilter === "unowned") {
        req = req.is("owner_staff_id", null);
      }

      switch (sort) {
        case "name_asc":
          req = req.order("name", { ascending: true });
          break;
        case "name_desc":
          req = req.order("name", { ascending: false });
          break;
        case "created_desc":
          req = req.order("created_at", { ascending: false });
          break;
        case "owner_asc":
          req = req.order("owner_name", { ascending: true, nullsFirst: false });
          break;
        case "last_activity_desc":
        default:
          req = req.order("last_activity_at", { ascending: false, nullsFirst: false });
          break;
      }

      const { data, count, error } = await req.range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) {
        handleApiError(error);
        throw error;
      }

      return {
        rows: (data ?? []) as CompanyListItem[],
        totalCount: count,
        offset: pageParam,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.rows.length, 0);
      if (typeof lastPage.totalCount === "number") {
        return loaded < lastPage.totalCount ? loaded : undefined;
      }
      return lastPage.rows.length === PAGE_SIZE ? loaded : undefined;
    },
  });

  if (!canView) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Companies</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t have permission to view companies.
        </p>
      </div>
    );
  }

  const rows = query.data?.pages.flatMap((page) => page.rows) ?? [];
  const totalCount = query.data?.pages[0]?.totalCount ?? null;
  const hasFilters = Boolean(debouncedSearch || ownerFilter !== "all");

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-border bg-background px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Companies</h1>
            {totalCount !== null ? (
              <span className="text-xs text-muted-foreground">
                {totalCount.toLocaleString("en-GB")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies…"
              className="h-8 bg-surface-subtle pr-8 pl-8 text-sm"
              aria-label="Search companies"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div
            role="group"
            aria-label="Owner filter"
            className="inline-flex h-8 items-center rounded-md border border-border bg-surface-subtle p-0.5"
          >
            {(
              [
                { id: "all", label: "All" },
                { id: "mine", label: "Mine" },
                { id: "unowned", label: "Unowned" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setOwnerFilter(option.id)}
                className={cn(
                  "h-7 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
                  ownerFilter === option.id
                    ? "bg-background text-foreground ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="h-8 w-[176px] bg-surface-subtle text-xs" aria-label="Sort companies">
                <ArrowUpDown className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {SORT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-surface-subtle">
            <tr className="h-9 text-xs font-medium text-muted-foreground">
              <th className="px-5 font-medium">Company</th>
              <th className="hidden px-4 font-medium sm:table-cell">Segment</th>
              <th className="px-4 font-medium">Owner</th>
              <th className="hidden px-4 font-medium lg:table-cell">Employees</th>
              <th className="px-5 text-right font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-row-divider">
            {query.isPending ? (
              Array.from({ length: 10 }).map((_, idx) => (
                <tr key={idx} className="h-[46px]">
                  <td className="px-5">
                    <Skeleton className="h-4 w-44" />
                  </td>
                  <td className="hidden px-4 sm:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="hidden px-4 lg:table-cell">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-5">
                    <Skeleton className="ml-auto h-4 w-28" />
                  </td>
                </tr>
              ))
            ) : query.isError ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <p className="text-sm text-muted-foreground">Could not load companies.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void query.refetch()}
                  >
                    Try again
                  </Button>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-subtle text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">No companies found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hasFilters
                      ? "Try adjusting your search or owner filter."
                      : "Companies visible to your account will appear here."}
                  </p>
                  {hasFilters ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setSearch("");
                        setOwnerFilter("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : null}
                </td>
              </tr>
            ) : (
              rows.map((company) => (
                <tr
                  key={company.id}
                  onClick={() =>
                    void navigate({
                      to: "/companies/$companyId",
                      params: { companyId: company.id },
                    })
                  }
                  className="h-[46px] cursor-pointer transition-colors hover:bg-accent"
                >
                  <td className="max-w-[280px] px-5">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-foreground">{company.name}</span>
                      {company.primary_domain ? (
                        <span className="hidden truncate text-xs text-muted-foreground md:inline">
                          {company.primary_domain}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="hidden px-4 sm:table-cell">
                    {company.segment ? (
                      <Badge variant="grey">{company.segment}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 text-foreground">
                    {company.owner_name ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="hidden px-4 text-muted-foreground lg:table-cell">
                    {company.employee_range
                      ? company.employee_range
                      : company.employee_count !== null
                        ? company.employee_count.toLocaleString("en-GB")
                        : formatText(null)}
                  </td>
                  <td className="whitespace-nowrap px-5 text-right text-xs text-muted-foreground">
                    {formatDateTime(company.last_activity_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 ? (
        <div className="flex items-center justify-between border-t border-border bg-surface-subtle px-5 py-3 text-xs text-muted-foreground">
          <span>
            Showing {rows.length.toLocaleString("en-GB")}
            {totalCount !== null ? ` of ${totalCount.toLocaleString("en-GB")}` : ""}
          </span>
          {query.hasNextPage ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Loading…
                </>
              ) : (
                "Load more"
              )}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}