import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Building2, Compass, Loader2 } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { getAvailableSpaces, getVisibleGroups } from "@/lib/navigation";
import { api } from "@/lib/supabase";
import type { CompanyListItem } from "@/lib/types";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const navigate = useNavigate();
  const { access, handleApiError } = useAuth();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const canViewCompanies = Boolean(!access || access.companies_view || access.is_global_admin);

  const companiesQuery = useQuery({
    queryKey: ["global-search-companies", debounced],
    enabled: open && canViewCompanies,
    queryFn: async () => {
      let req = api
        .from("companies_list")
        .select("id,name,primary_domain,segment,owner_name")
        .order("last_activity_at", { ascending: false, nullsFirst: false })
        .limit(8);
      if (debounced) {
        req = req.ilike("name", `%${debounced}%`);
      }
      const { data, error } = await req;
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as Pick<
        CompanyListItem,
        "id" | "name" | "primary_domain" | "segment" | "owner_name"
      >[];
    },
  });

  const navItems = getAvailableSpaces(access).flatMap((space) =>
    getVisibleGroups(space.id, access).flatMap((group) =>
      group.items.map((item) => ({
        spaceLabel: space.label,
        label: item.label,
        path: item.path,
      })),
    ),
  );

  const filteredNav = debounced
    ? navItems.filter(
        (item) =>
          item.label.toLowerCase().includes(debounced.toLowerCase()) ||
          item.spaceLabel.toLowerCase().includes(debounced.toLowerCase()),
      )
    : navItems.slice(0, 6);

  const openPath = (path: string) => {
    onOpenChange(false);
    if (path === "/companies") {
      void navigate({ to: "/companies" });
      return;
    }
    if (path.startsWith("/marketing/")) {
      void navigate({
        to: "/marketing/$section",
        params: { section: path.slice("/marketing/".length) },
      });
      return;
    }
    if (path.startsWith("/admin/")) {
      void navigate({
        to: "/admin/$section",
        params: { section: path.slice("/admin/".length) },
      });
      return;
    }
    void navigate({ to: "/$section", params: { section: path.replace(/^\//, "") } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Search everything</DialogTitle>
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search companies or jump to a page…"
          />
          <CommandList>
            {companiesQuery.isFetching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching…
              </div>
            ) : null}

            {!companiesQuery.isFetching &&
            (companiesQuery.data?.length ?? 0) === 0 &&
            filteredNav.length === 0 ? (
              <CommandEmpty>No matching companies or pages.</CommandEmpty>
            ) : null}

            {companiesQuery.data && companiesQuery.data.length > 0 ? (
              <CommandGroup heading="Companies">
                {companiesQuery.data.map((company) => (
                  <CommandItem
                    key={company.id}
                    value={company.id}
                    onSelect={() => {
                      onOpenChange(false);
                      void navigate({
                        to: "/companies/$companyId",
                        params: { companyId: company.id },
                      });
                    }}
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{company.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[company.primary_domain, company.segment, company.owner_name]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {filteredNav.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Pages">
                  {filteredNav.map((item) => (
                    <CommandItem
                      key={item.path}
                      value={item.path}
                      onSelect={() => openPath(item.path)}
                    >
                      <Compass className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{item.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {item.spaceLabel}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}