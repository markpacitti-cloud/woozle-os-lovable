import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpDown, Loader2, Search, Users, X } from "lucide-react";

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
import type { PersonListItem } from "@/lib/types";

const PAGE_SIZE = 50;

type SortOption =
  | "last_activity_desc"
  | "name_asc"
  | "name_desc"
  | "company_asc"
  | "created_desc";

const SORT_LABELS: Record<SortOption, string> = {
  last_activity_desc: "Last activity",
  name_asc: "Name (A–Z)",
  name_desc: "Name (Z–A)",
  company_asc: "Company (A–Z)",
  created_desc: "Recently created",
};

export function buildPeopleSearchOrFilter(rawSearch: string): string | null {
  const clean = rawSearch.replace(/[,()]/g, " ").trim();
  if (!clean) return null;
  return `full_name.ilike.%${clean}%,primary_email.ilike.%${clean}%`;
}

export function PeopleListPage() {
  const navigate = useNavigate();
  const { access, handleApiError } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("last_activity_desc");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const canView = Boolean(!access || access.people_view || access.is_global_admin);

  const query = useInfiniteQuery({
    queryKey: ["people", { search: debouncedSearch, sort }],
    enabled: canView,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let req = api
        .from("people_list")
        .select(
          "id,full_name,first_name,last_name,linkedin_url,primary_company_id,primary_company_name,primary_title,primary_email_id,primary_email,primary_email_status,phone,source,created_at,updated_at,last_activity_at",
          { count: "exact" },
        );

      const orFilter = buildPeopleSearchOrFilter(debouncedSearch);
      if (orFilter) {
        req = req.or(orFilter);
      }

      switch (sort) {
        case "name_asc":
          req = req.order("full_name", { ascending: true });
          break;
        case "name_desc":
          req = req.order("full_name", { ascending: false });
          break;
        case "company_asc":
          req = req.order("primary_company_name", { ascending: true, nullsFirst: false });
          break;
        case "created_desc":
          req = req.order("created_at", { ascending: false });
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
        rows: (data ?? []) as PersonListItem[],
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
        <h1 className="text-xl font-semibold tracking-tight text-foreground">People</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t have permission to view people.
        </p>
      </div>
    );
  }

  const seenIds = new Set<string>();
  const rows = (query.data?.pages.flatMap((page) => page.rows) ?? []).filter((person) => {
    if (seenIds.has(person.id)) return false;
    seenIds.add(person.id);
    return true;
  });
  const totalCount = query.data?.pages[0]?.totalCount ?? null;
  const hasFilters = Boolean(debouncedSearch);

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-border bg-background px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">People</h1>
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
              placeholder="Search name or email…"
              className="h-8 bg-surface-subtle pr-8 pl-8 text-sm"
              aria-label="Search people by name or email"
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

          <div className="ml-auto flex items-center gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger
                className="h-8 w-[176px] bg-surface-subtle text-xs"
                aria-label="Sort people"
              >
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
              <th className="px-5 font-medium">Name</th>
              <th className="hidden px-4 font-medium sm:table-cell">Role</th>
              <th className="px-4 font-medium">Company</th>
              <th className="hidden px-4 font-medium lg:table-cell">Email</th>
              <th className="px-5 text-right font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-row-divider">
            {query.isPending ? (
              Array.from({ length: 10 }).map((_, idx) => (
                <tr key={idx} className="h-[46px]">
                  <td className="px-5">
                    <Skeleton className="h-4 w-36" />
                  </td>
                  <td className="hidden px-4 sm:table-cell">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="hidden px-4 lg:table-cell">
                    <Skeleton className="h-4 w-44" />
                  </td>
                  <td className="px-5">
                    <Skeleton className="ml-auto h-4 w-28" />
                  </td>
                </tr>
              ))
            ) : query.isError ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <p className="text-sm text-muted-foreground">Could not load people.</p>
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
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">No people found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hasFilters
                      ? "Try adjusting your search query."
                      : "People visible to your account will appear here."}
                  </p>
                  {hasFilters ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setSearch("")}
                    >
                      Clear search
                    </Button>
                  ) : null}
                </td>
              </tr>
            ) : (
              rows.map((person) => (
                <tr
                  key={person.id}
                  onClick={() =>
                    void navigate({
                      to: "/people/$personId",
                      params: { personId: person.id },
                    })
                  }
                  className="h-[46px] cursor-pointer transition-colors hover:bg-accent"
                >
                  <td className="max-w-[240px] px-5">
                    <span className="block truncate font-medium text-foreground">
                      {person.full_name}
                    </span>
                  </td>
                  <td className="hidden max-w-[220px] truncate px-4 text-muted-foreground sm:table-cell">
                    {formatText(person.primary_title)}
                  </td>
                  <td className="max-w-[200px] truncate px-4 text-foreground">
                    {person.primary_company_name ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden max-w-[240px] truncate px-4 text-xs text-muted-foreground lg:table-cell">
                    {formatText(person.primary_email)}
                  </td>
                  <td className="whitespace-nowrap px-5 text-right text-xs text-muted-foreground">
                    {formatDateTime(person.last_activity_at)}
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